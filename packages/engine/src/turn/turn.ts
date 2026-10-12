import {
  PawnIdSchema,
  hexKey,
  type ErrorCode,
  type HexCoord,
  type OpenedHex,
  type PawnId,
  type PrivateStatus,
  type TileOption,
} from "@pejuang/shared";
import { findDeadEndOptions, getEnterableHexes, LIT_HEX_COUNT, markHexUsed, pickLitHexes } from "../board/movement";
import type { BoardState } from "../board/board-state";
import { getCalendarInfo } from "../calendar/calendar";
import { applyEffects } from "../economy/apply-effects";
import { applyDoomSpending } from "../economy/doom";
import { TOTAL_STEPS } from "../economy/schedule";
import { isBankrupt, isBurnout, type EliminationReason } from "../economy/elimination";
import type { DomainEvent } from "../game/domain-events";
import type { GameState, PlayerState } from "../game/game-state";
import type { RandomSource } from "../random";
import { buildTileOption, type RealityContext } from "../reality/tile-option";
import { resolveReality } from "../reality/resolve-reality";
import { rankPlayers, toScoreRows, type RankingEntry } from "../score/ranking";
import { calculateWelfareScore } from "../score/score";
import type { RoundResult } from "./round";

export type TurnResult =
  | {
      ok: true;
      state: GameState;
      events: DomainEvent[];
      nextAction: "nextTurn" | "endRound" | "finished";
    }
  | { ok: false; code: ErrorCode; message: string };

export interface PlayerIdentity {
  name: string;
  pawn: PawnId;
  /** Diisi server (G5); engine meneruskannya ke `game:finished`. */
  avatarId?: string;
}

/** Nilai awal; server mengisi turnSeconds dan deadline yang sebenarnya. */
const DEFAULT_TURN_SECONDS = 30;

function fail(code: ErrorCode, message: string): { ok: false; code: ErrorCode; message: string } {
  return { ok: false, code, message };
}

function realityContext(state: GameState, playerId: string): RealityContext {
  return {
    season: state.public.calendar.season,
    isRankOneBurden: state.public.rankOneBurden.includes(playerId),
    health: state.players[playerId]!.status.health,
  };
}

/** Pemain hidup di turnOrder yang belum melangkah di ronde ini, sesuai urutan. */
function remainingPlayers(state: GameState): string[] {
  return state.public.turnOrder.filter(
    (id) => !state.movedThisRound.includes(id) && !state.players[id]?.eliminated,
  );
}

/**
 * GDD 4.7: Petak Emas aktif yang bersebelahan dengan pion dan bisa dimasuki
 * SELALU menyala (mengisi satu dari maksimal {@link LIT_HEX_COUNT} slot); slot
 * lain diundi seperti biasa. Opsi Jalan Buntu dibiarkan apa adanya (Petak Emas
 * masuk hanya bila memang termasuk heksa tertutup terdekat).
 */
function withGoldLit(
  board: BoardState,
  origin: HexCoord,
  goldHex: HexCoord | null,
  lit: HexCoord[],
): HexCoord[] {
  if (!goldHex) return lit;
  if (lit.some((hex) => hexKey(hex) === hexKey(goldHex))) return lit;
  const enterable = getEnterableHexes(board, origin);
  if (!enterable.some((hex) => hexKey(hex) === hexKey(goldHex))) return lit;
  return [goldHex, ...lit].slice(0, LIT_HEX_COUNT);
}

/** GDD 4.2: Fase Pilihan untuk pemain berikutnya yang belum melangkah di ronde ini. */
export function startTurn(state: GameState, random: RandomSource): RoundResult {
  const step = state.public.calendar.step;
  const skipped: string[] = [];

  for (const playerId of remainingPlayers(state)) {
    const pawn = state.public.pawns.find((p) => p.playerId === playerId);
    if (!pawn) continue;

    let mode: "normal" | "deadEnd" = "normal";
    let hexes: HexCoord[] = pickLitHexes(state.board, pawn.hex, random);
    hexes = withGoldLit(state.board, pawn.hex, state.public.gold?.hex ?? null, hexes);
    let distances: number[] = [];
    if (hexes.length === 0) {
      const deadEnd = findDeadEndOptions(state.board, pawn.hex, random);
      mode = "deadEnd";
      hexes = deadEnd.map((option) => option.hex);
      distances = deadEnd.map((option) => option.distance);
    }
    // Papan penuh: tidak ada langkah, pemain dilewati.
    if (hexes.length === 0) {
      skipped.push(playerId);
      continue;
    }

    const context = realityContext(state, playerId);
    const options = hexes.map((hex) =>
      buildTileOption(hex, state.board.tiles[hexKey(hex)]!, context),
    );
    const turnId = `turn-${step}-${playerId}`;
    const target = { kind: "player", playerId } as const;

    const events: DomainEvent[] = [
      {
        type: "turn:start",
        target: { kind: "room" },
        payload: {
          version: 0,
          turnId,
          playerId,
          deadline: 0, // diisi server
          turnSeconds: DEFAULT_TURN_SECONDS,
        },
      },
      mode === "normal"
        ? { type: "turn:options", target, payload: { turnId, options } }
        : {
            type: "turn:dead-end",
            target,
            payload: {
              turnId,
              options: options.map((option, index) => ({
                ...option,
                distance: distances[index]!,
              })),
              stressPenalty: 1,
            },
          },
    ];

    return {
      state: {
        ...state,
        phase: "turn",
        movedThisRound: [...state.movedThisRound, ...skipped],
        public: { ...state.public, activePlayerId: playerId },
        pendingTurn: { turnId, playerId, mode, options: hexes },
      },
      events,
    };
  }
  return {
    state: { ...state, movedThisRound: [...state.movedThisRound, ...skipped] },
    events: [],
  };
}

function applyChoice(
  state: GameState,
  playerId: string,
  hex: HexCoord,
  random: RandomSource,
  autoPicked: boolean,
): TurnResult {
  const pending = state.pendingTurn!;
  const step = state.public.calendar.step;
  const target = { kind: "player", playerId } as const;
  const room = { kind: "room" } as const;
  const events: DomainEvent[] = [];

  const player = state.players[playerId]!;
  const context = realityContext(state, playerId);
  const tileId = state.board.tiles[hexKey(hex)]!;
  const option: TileOption = buildTileOption(hex, tileId, context);
  const from = state.public.pawns.find((p) => p.playerId === playerId)!.hex;

  let status: PrivateStatus = player.status;
  // Kekurangan Kekayaan dari Rencana/Realita yang melewati limit Hutang dihapus
  // tanpa eliminasi; Bangkrut hanya dari Doom Spending (GDD 1.4, 2.5).
  const apply = (effects: Parameters<typeof applyEffects>[1]) => {
    status = applyEffects(status, effects).status;
  };

  // Fase Berjalan: pion pindah, heksa terbuka, Rencana diterapkan.
  const board = {
    ...markHexUsed(state.board, hex),
    goldOrigin: option.isGold ? null : state.board.goldOrigin,
  };
  if (pending.mode === "deadEnd") apply([{ stat: "stress", delta: 1 }]);
  apply(option.plan);
  events.push({
    type: "tile:opened",
    target: room,
    payload: {
      version: 0,
      turnId: pending.turnId,
      playerId,
      from,
      to: hex,
      category: option.category,
      title: option.title,
      plan: option.plan,
      isGold: option.isGold,
      viaJump: pending.mode === "deadEnd",
      autoPicked,
    },
  });

  // Fase Realita. Petak Emas tidak punya Realita (GDD 4.7).
  let outcome: OpenedHex["outcome"] = null;
  if (!option.isGold) {
    const reality = resolveReality(tileId, context, random);
    outcome = reality.outcome;
    apply(reality.effects);
    events.push({
      type: "tile:resolved",
      target: room,
      payload: {
        version: 0,
        turnId: pending.turnId,
        playerId,
        hex,
        outcome: reality.outcome,
        text: reality.text,
        effects: reality.effects,
        seasonal: reality.seasonal,
      },
    });
  }

  // Doom Spending (GDD 2.5).
  const doom = applyDoomSpending(status, random);
  if (doom.triggered) {
    status = doom.status;
    events.push({
      type: "doom:triggered",
      target,
      payload: { amount: doom.amount, trigger: "tile", stressAfter: status.stress },
    });
  }

  const eliminatedReason: EliminationReason | null =
    isBankrupt(status) ? "bankrupt" : isBurnout(status) ? "burnout" : null;

  const updatedPlayer: PlayerState = eliminatedReason
    ? {
        status,
        eliminated: true,
        eliminatedAtStep: step,
        eliminatedReason,
        frozenScore: calculateWelfareScore(status).score,
        inviteCard: null,
      }
    : { ...player, status };
  const players = { ...state.players, [playerId]: updatedPlayer };
  if (eliminatedReason) {
    events.push({
      type: "player:eliminated",
      target: room,
      payload: {
        version: 0,
        playerId,
        reason: eliminatedReason,
        step,
        frozenScore: calculateWelfareScore(status).score,
      },
    });
  }
  events.push({ type: "player:status", target, payload: status });

  const scores = toScoreRows(rankingEntries(players, state.baseTurnOrder));
  events.push({
    type: "game:patch",
    target: room,
    payload: { version: 0, ops: [{ type: "scores", scores }] },
  });

  const openedHexes = [
    ...state.public.openedHexes,
    {
      hex,
      category: option.category,
      title: option.title,
      outcome,
      byPlayerId: playerId,
      step,
    },
  ];
  const next: GameState = {
    ...state,
    board,
    players,
    pendingTurn: null,
    movedThisRound: [...state.movedThisRound, playerId],
    public: {
      ...state.public,
      pawns: state.public.pawns.map((p) => (p.playerId === playerId ? { ...p, hex } : p)),
      openedHexes,
      scores,
      gold: option.isGold ? null : state.public.gold,
      eliminated: eliminatedReason
        ? [...state.public.eliminated, playerId]
        : state.public.eliminated,
    },
  };

  const early = checkEarlyFinish(next);
  if (early) {
    return {
      ok: true,
      state: early.state,
      events: [...events, ...early.events],
      nextAction: "finished",
    };
  }
  const nextAction = remainingPlayers(next).length > 0 ? "nextTurn" : "endRound";
  return { ok: true, state: next, events, nextAction };
}

export function rankingEntries(
  players: Record<string, PlayerState>,
  order: readonly string[],
): RankingEntry[] {
  return order.map((playerId) => ({
    playerId,
    status: players[playerId]!.status,
    eliminated: players[playerId]!.eliminated,
    eliminatedAtStep: players[playerId]!.eliminatedAtStep,
    frozenScore: players[playerId]!.frozenScore ?? null,
  }));
}

/** turn:choose dan turn:jump: pemain aktif memilih heksa tujuan. */
export function chooseHex(
  state: GameState,
  playerId: string,
  turnId: string,
  hex: HexCoord,
  random: RandomSource,
): TurnResult {
  if (state.phase === "finished") return fail("GAME_FINISHED", "Permainan sudah selesai.");
  const pending = state.pendingTurn;
  if (!pending || pending.playerId !== playerId) {
    return fail("NOT_YOUR_TURN", "Bukan giliranmu.");
  }
  if (pending.turnId !== turnId) return fail("STALE_VERSION", "Giliran sudah lewat.");
  if (!pending.options.some((option) => hexKey(option) === hexKey(hex))) {
    return fail("TILE_NOT_LIT", "Heksa itu tidak menyala.");
  }
  return applyChoice(state, playerId, hex, random, false);
}

/** Waktu giliran habis: heksa dipilih acak dari opsi yang menyala (GDD 4.3). */
export function timeoutTurn(state: GameState, turnId: string, random: RandomSource): TurnResult {
  const pending = state.pendingTurn;
  if (!pending || pending.turnId !== turnId) {
    return fail("STALE_VERSION", "Giliran sudah lewat.");
  }
  const hex = random.pick(pending.options);
  return applyChoice(state, pending.playerId, hex, random, true);
}

/** Langkah 24 selesai -> finishGame; selain itu lanjut ke langkah berikutnya. */
export function endRound(state: GameState, _random: RandomSource): RoundResult {
  const step = state.public.calendar.step;
  if (step >= TOTAL_STEPS) return finishGame(state);
  return {
    state: {
      ...state,
      phase: "roundStart",
      pendingTurn: null,
      movedThisRound: [],
      public: {
        ...state.public,
        calendar: getCalendarInfo(step + 1),
        activePlayerId: null,
      },
    },
    events: [],
  };
}

/**
 * GDD 1.2 v1.10: game selesai lebih cepat bila pemain yang belum tereliminasi <= 1.
 * Mengembalikan hasil finishGame, atau null bila game berlanjut. Pemain yang tersisa
 * otomatis peringkat 1 karena rankPlayers menaruh pemain bertahan di atas yang tereliminasi.
 */
export function checkEarlyFinish(state: GameState): RoundResult | null {
  const alive = Object.values(state.players).filter((player) => !player.eliminated).length;
  return alive <= 1 ? finishGame(state) : null;
}

/**
 * Menutup game dan membuat peringkat akhir. Engine tidak tahu nama dan pion;
 * server mengisinya lewat `identities` (bila kosong: playerId dan pion berurutan).
 */
export function finishGame(
  state: GameState,
  identities: Record<string, PlayerIdentity> = {},
): RoundResult {
  const ranked = rankPlayers(rankingEntries(state.players, state.baseTurnOrder));
  const pawns = PawnIdSchema.options;
  const ranking = ranked.map((player) => {
    const index = state.baseTurnOrder.indexOf(player.playerId);
    const identity = identities[player.playerId];
    return {
      rank: player.rank,
      playerId: player.playerId,
      name: identity?.name ?? player.playerId,
      pawn: identity?.pawn ?? pawns[index % pawns.length]!,
      ...(identity?.avatarId ? { avatarId: identity.avatarId } : {}),
      points: player.points,
      finalScore: player.score,
      netWorth: player.netWorth,
      modifier: "none" as const,
      modifierPct: 0 as const,
      eliminated: player.eliminated,
      eliminatedAtStep: player.eliminatedAtStep,
    };
  });
  return {
    state: {
      ...state,
      phase: "finished",
      pendingTurn: null,
      public: { ...state.public, activePlayerId: null },
    },
    events: [
      { type: "game:finished", target: { kind: "room" }, payload: { version: 0, ranking } },
    ],
  };
}
