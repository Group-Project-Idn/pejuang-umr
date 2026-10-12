import { describe, expect, it } from "vitest";
import {
  getHexDistance,
  getNeighbors,
  hexKey,
  type HexCoord,
  type PrivateStatus,
} from "@pejuang/shared";
import { getCalendarInfo } from "../calendar/calendar";
import { calculateWelfareScore } from "../score/score";
import { GOLD_TILES } from "../data";
import { createGame } from "../game/create-game";
import type { DomainEvent } from "../game/domain-events";
import type { GameState } from "../game/game-state";
import { getEnterableHexes } from "../board/movement";
import { SequenceRandomSource } from "../random";
import { resolveReality } from "../reality/resolve-reality";
import { startRound } from "./round";
import { checkEarlyFinish, chooseHex, endRound, finishGame, startTurn, timeoutTurn } from "./turn";

const IDS = ["a", "b", "c"];

function seeded(seed = 0.37) {
  return new SequenceRandomSource([seed, 0.61, 0.13, 0.88, 0.45, 0.72]);
}

function makeGame(step = 2): GameState {
  const { state } = createGame(IDS, "g", new SequenceRandomSource([0.1, 0.5, 0.9, 0.3, 0.7]));
  return {
    ...state,
    phase: "turn",
    public: { ...state.public, calendar: getCalendarInfo(step) },
  };
}

/** Realita selalu "safe" (roll 99,9 >= 90) dan Doom memakai nilai tengah. */
function safeRandom() {
  return new SequenceRandomSource([0.999, 0.5, 0.5]);
}

function forceTile(state: GameState, tileId: string): GameState {
  return {
    ...state,
    board: {
      ...state.board,
      tiles: Object.fromEntries(Object.keys(state.board.tiles).map((key) => [key, tileId])),
    },
  };
}

function withStatus(state: GameState, playerId: string, patch: Partial<PrivateStatus>): GameState {
  const player = state.players[playerId]!;
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...player, status: { ...player.status, ...patch } },
    },
  };
}

function ofType<T extends DomainEvent["type"]>(events: DomainEvent[], type: T) {
  return events.filter((e): e is Extract<DomainEvent, { type: T }> => e.type === type);
}

function begin(state: GameState, random = seeded()) {
  const started = startTurn(state, random);
  const playerId = started.state.pendingTurn!.playerId;
  return { ...started, playerId, turnId: started.state.pendingTurn!.turnId };
}

/** Pemain aktif memilih heksa pertama; mengembalikan state setelah Fase Berjalan. */
function choose(state: GameState, random: SequenceRandomSource = safeRandom()) {
  const { state: started, playerId, turnId } = begin(state);
  const result = chooseHex(started, playerId, turnId, started.pendingTurn!.options[0]!, random);
  if (!result.ok) throw new Error(result.message);
  return { ...result, playerId };
}

/** Fase Pembalikan dari state setelah pemain melangkah. */
function reveal(state: GameState, random: SequenceRandomSource = new SequenceRandomSource([0.5])) {
  return endRound(state, random);
}

function pawnOf(state: GameState, playerId: string): HexCoord {
  return state.public.pawns.find((p) => p.playerId === playerId)!.hex;
}

function closeAllNeighbors(state: GameState, playerId: string): GameState {
  const keys = getNeighbors(pawnOf(state, playerId)).map(hexKey);
  return {
    ...state,
    board: {
      ...state.board,
      usedHexKeys: [...state.board.usedHexKeys, ...keys],
    },
  };
}

/** Menempatkan Petak Emas di tetangga pion yang bisa dimasuki (untest keputusan Langkah A). */
function placeGoldNear(
  state: GameState,
  playerId: string,
  goldId = "full-scholarship",
): { state: GameState; goldHex: HexCoord } {
  const pawn = state.public.pawns.find((p) => p.playerId === playerId)!;
  const goldHex = getEnterableHexes(state.board, pawn.hex)[0]!;
  const def = GOLD_TILES.find((tile) => tile.id === goldId)!;
  return {
    goldHex,
    state: {
      ...state,
      board: { ...state.board, tiles: { ...state.board.tiles, [hexKey(goldHex)]: goldId } },
      public: {
        ...state.public,
        gold: {
          goldId,
          hex: goldHex,
          title: def.title,
          plan: def.plan,
          expiresAtStep: state.public.calendar.step + 4,
        },
      },
    },
  };
}

describe("startTurn", () => {
  it("giliran normal: maksimal 3 opsi, semuanya tetangga pion", () => {
    const { state, events, playerId } = begin(makeGame());
    expect(playerId).toBe(state.public.turnOrder[0]);
    expect(state.public.activePlayerId).toBe(playerId);
    const options = ofType(events, "turn:options")[0]!;
    expect(options.target).toEqual({ kind: "player", playerId });
    expect(options.payload.options.length).toBeGreaterThan(0);
    expect(options.payload.options.length).toBeLessThanOrEqual(3);
    for (const option of options.payload.options) {
      expect(getHexDistance(pawnOf(state, playerId), option.hex)).toBe(1);
    }
    expect(ofType(events, "turn:start")[0]!.target).toEqual({ kind: "room" });
  });

  it("tidak ada turn:options atau turn:dead-end ke target room", () => {
    const normal = begin(makeGame()).events;
    const game = makeGame();
    const deadEnd = startTurn(closeAllNeighbors(game, game.public.turnOrder[0]!), seeded()).events;
    for (const event of [...normal, ...deadEnd]) {
      if (event.type === "turn:options" || event.type === "turn:dead-end") {
        expect(event.target.kind).toBe("player");
      }
    }
  });

  it("memilih pemain pertama yang belum melangkah dan melewati yang tereliminasi", () => {
    const game = makeGame();
    const [first, second, third] = game.public.turnOrder as [string, string, string];
    const afterFirst: GameState = {
      ...game,
      movedThisRound: [first],
      players: {
        ...game.players,
        [second]: { ...game.players[second]!, eliminated: true },
      },
    };
    expect(startTurn(afterFirst, seeded()).state.public.activePlayerId).toBe(third);
  });

  it("langkah 3 (bulan 2): giliran pertama adalah turnOrder[0] versi baru", () => {
    // Ronde 2 berakhir di pemain terakhir; semua sudah melangkah.
    const ended = makeGame(2);
    const lastOfOld = ended.public.turnOrder.at(-1)!;
    const afterRound2: GameState = {
      ...ended,
      movedThisRound: [...ended.public.turnOrder],
      public: { ...ended.public, activePlayerId: lastOfOld },
    };
    const round3 = startRound(endRound(afterRound2, seeded()).state, seeded()).state;
    expect(round3.public.calendar.step).toBe(3);
    expect(round3.movedThisRound).toEqual([]);

    const base = round3.baseTurnOrder;
    expect(round3.public.turnOrder).toEqual([base[1], base[2], base[0]]);
    const first = startTurn(round3, seeded());
    expect(first.state.public.activePlayerId).toBe(round3.public.turnOrder[0]);
    expect(first.state.public.activePlayerId).toBe(base[1]);
  });

  it("Jalan Buntu: turn:dead-end, lompat menambah Level Stress +1", () => {
    const game0 = forceTile(makeGame(), "quick-freelance");
    const game = closeAllNeighbors(game0, game0.public.turnOrder[0]!);
    const { state, events, playerId, turnId } = begin(game);
    expect(state.pendingTurn!.mode).toBe("deadEnd");
    expect(ofType(events, "turn:dead-end")[0]!.payload.stressPenalty).toBe(1);
    expect(ofType(events, "turn:options")).toHaveLength(0);

    const hex = state.pendingTurn!.options[0]!;
    const result = chooseHex(state, playerId, turnId, hex, safeRandom());
    if (!result.ok) throw new Error(result.message);
    expect(ofType(result.events, "tile:opened")[0]!.payload.viaJump).toBe(true);
    // Rencana quick-freelance tidak mengubah stress, Realita safe tanpa efek.
    expect(result.state.players[playerId]!.status.stress).toBe(1);
  });

  it("turn:options pemain dengan Beban Peringkat 1 membawa riskTags rankOne (GDD 4.6)", () => {
    const base = makeGame(5);
    const order = base.public.turnOrder;
    // startRound di langkah 5 (ganti bulan) memutar urutan, jadi yang jalan
    // pertama adalah order[1]. Beri dia skor tertinggi agar menanggung beban.
    const firstToMove = order[1]!;
    const game: GameState = {
      ...base,
      public: {
        ...base.public,
        scores: order.map((id, index) => ({
          playerId: id,
          provisionalScore: index === 1 ? 100 : 10,
          rank: index + 1,
          eliminated: false,
        })),
      },
    };

    const started = startRound(game, seeded()).state;
    expect(started.public.rankOneBurden).toEqual([firstToMove]);

    const turn = startTurn(started, seeded());
    expect(turn.state.pendingTurn!.playerId).toBe(firstToMove);
    const options = ofType(turn.events, "turn:options")[0]!;
    expect(options.target).toEqual({ kind: "player", playerId: firstToMove });
    expect(options.payload.options.length).toBeGreaterThan(0);
    for (const option of options.payload.options) {
      expect(option.riskTags).toContainEqual({ type: "rankOne", plusPct: 15 });
    }
  });

  it("Petak Emas bersebelahan dengan pion selalu ada di turn:options (100 seed)", () => {
    const base = makeGame(5);
    const first = base.public.turnOrder[0]!;
    const { state, goldHex } = placeGoldNear(base, first);
    for (let seed = 0; seed < 100; seed += 1) {
      const { events } = startTurn(state, new SequenceRandomSource([seed / 100]));
      const options = ofType(events, "turn:options")[0]!;
      const keys = options.payload.options.map((option) => hexKey(option.hex));
      expect(keys).toContain(hexKey(goldHex));
      expect(keys.length).toBeLessThanOrEqual(3);
    }
  });
});

describe("chooseHex", () => {
  it("menolak heksa yang tidak menyala, turnId lama, dan pemain lain", () => {
    const { state, playerId, turnId } = begin(makeGame());
    const lit = new Set(state.pendingTurn!.options.map(hexKey));
    const unlit =
      getNeighbors(pawnOf(state, playerId)).find((hex) => !lit.has(hexKey(hex))) ??
      pawnOf(state, playerId);
    const code = (r: ReturnType<typeof chooseHex>) => (r.ok ? "ok" : r.code);
    const hex = state.pendingTurn!.options[0]!;

    expect(code(chooseHex(state, playerId, turnId, unlit, seeded()))).toBe("TILE_NOT_LIT");
    expect(code(chooseHex(state, playerId, "turn-lama", hex, seeded()))).toBe("STALE_VERSION");
    const other = IDS.find((id) => id !== playerId)!;
    expect(code(chooseHex(state, other, turnId, hex, seeded()))).toBe("NOT_YOUR_TURN");
  });

  it("memindahkan pion, membuka heksa, dan menerapkan Rencana saja (Realita ditunda)", () => {
    // hanging-out: Rencana Kekayaan -500rb, Realita safe tanpa efek.
    const { state, playerId, turnId } = begin(forceTile(makeGame(), "hanging-out"));
    const hex = state.pendingTurn!.options[0]!;
    const result = chooseHex(state, playerId, turnId, hex, safeRandom());
    if (!result.ok) throw new Error(result.message);

    const next = result.state;
    expect(next.board.usedHexKeys).toContain(hexKey(hex));
    expect(pawnOf(next, playerId)).toEqual(hex);
    expect(next.pendingTurn).toBeNull();
    expect(next.movedThisRound).toEqual([playerId]);
    expect(next.public.openedHexes.at(-1)).toMatchObject({
      hex,
      byPlayerId: playerId,
      outcome: null,
      reality: null,
    });
    expect(next.public.openedHexes.at(-1)!.plan).toContainEqual({ stat: "wealth", delta: -500_000 });
    expect(next.players[playerId]!.status.wealth).toBe(7_000_000);

    expect(ofType(result.events, "player:status")[0]!.target).toEqual({
      kind: "player",
      playerId,
    });
    expect(ofType(result.events, "game:patch")).toHaveLength(0);
    expect(ofType(result.events, "doom:triggered")).toHaveLength(0);
    expect(ofType(result.events, "player:eliminated")).toHaveLength(0);
  });

  it("setelah turn:choose tidak ada tile:resolved dan state publik tidak memuat isi Realita", () => {
    const { state, playerId, turnId } = begin(forceTile(makeGame(), "hanging-out"));
    const result = chooseHex(state, playerId, turnId, state.pendingTurn!.options[0]!, safeRandom());
    if (!result.ok) throw new Error(result.message);
    expect(ofType(result.events, "tile:resolved")).toHaveLength(0);

    // Realita tersimpan tersembunyi, bukan di state publik maupun event.
    const hidden = result.state.pendingRealities[0]!;
    expect(hidden).toMatchObject({ playerId, turnId, outcome: "safe" });
    const exposed = JSON.stringify([result.state.public, result.events]);
    expect(exposed).not.toContain(hidden.text);
    expect(exposed).not.toContain('"seasonal"');
    expect(result.state.public.openedHexes.at(-1)!.reality).toBeNull();
    expect(result.state.public.openedHexes.at(-1)!.outcome).toBeNull();
  });

  it("Realita memakai konteks saat memilih, bukan peringkat setelah memilih", () => {
    // Pemain pertama sudah menjadi Peringkat 1 di papan skor, tetapi Beban Peringkat 1
    // baru berlaku di startRound berikutnya: peluang saat memilih tanpa beban.
    const first = makeGame().public.turnOrder[0]!;
    const base = forceTile(makeGame(), "hanging-out");
    const game: GameState = {
      ...base,
      public: {
        ...base.public,
        scores: base.public.turnOrder.map((id, index) => ({
          playerId: id,
          provisionalScore: id === first ? 99 : 10 + index,
          rank: id === first ? 1 : index + 1,
          eliminated: false,
        })),
      },
    };
    for (let i = 0; i < 100; i += 1) {
      const { state, playerId, turnId } = begin(game);
      const roll = () => new SequenceRandomSource([i / 100, 0.5]);
      const result = chooseHex(state, playerId, turnId, state.pendingTurn!.options[0]!, roll());
      if (!result.ok) throw new Error(result.message);
      const tileId = game.board.tiles[hexKey(state.pendingTurn!.options[0]!)]!;
      const expected = resolveReality(
        tileId,
        { season: game.public.calendar.season, isRankOneBurden: false, health: 10 },
        roll(),
      );
      expect(result.state.pendingRealities[0]!.outcome).toBe(expected.outcome);
    }
    // Beban Peringkat 1 yang sudah berlaku saat memilih ikut memengaruhi peluang.
    const burdened: GameState = { ...game, public: { ...game.public, rankOneBurden: [first] } };
    const outcomes = new Set<string>();
    for (let i = 0; i < 100; i += 1) {
      const { state, playerId, turnId } = begin(burdened);
      const result = chooseHex(
        state,
        playerId,
        turnId,
        state.pendingTurn!.options[0]!,
        new SequenceRandomSource([i / 100, 0.5]),
      );
      if (!result.ok) throw new Error(result.message);
      outcomes.add(result.state.pendingRealities[0]!.outcome);
    }
    expect(outcomes.size).toBeGreaterThan(0);
  });

  it("nextAction: nextTurn sampai pemain terakhir, lalu endRound", () => {
    let state = makeGame();
    const actions: string[] = [];
    for (let i = 0; i < 3; i++) {
      const { state: started, playerId, turnId } = begin(state);
      const hex = started.pendingTurn!.options[0]!;
      const result = chooseHex(started, playerId, turnId, hex, seeded());
      if (!result.ok) throw new Error(result.message);
      actions.push(result.nextAction);
      state = result.state;
    }
    expect(actions).toEqual(["nextTurn", "nextTurn", "endRound"]);
    expect(startTurn(state, seeded()).events).toEqual([]);
  });

  it("Doom tidak dijalankan saat memilih; baru di Fase Pembalikan (Level Stress >= 9)", () => {
    // buying-vitamins tidak mengubah stress; Realita safe tanpa efek.
    const first = makeGame().public.turnOrder[0]!;
    const game = withStatus(forceTile(makeGame(), "buying-vitamins"), first, { stress: 10 });
    const chosen = choose(game);
    expect(ofType(chosen.events, "doom:triggered")).toHaveLength(0);
    expect(chosen.state.players[chosen.playerId]!.status.stress).toBe(10);

    const revealed = reveal(chosen.state);
    const doom = ofType(revealed.events, "doom:triggered")[0]!;
    expect(doom.target).toEqual({ kind: "player", playerId: chosen.playerId });
    expect(doom.payload.trigger).toBe("tile");
    expect(doom.payload.round).toBe(2);
    expect(doom.payload.stressAfter).toBe(9);
    const status = revealed.state.players[chosen.playerId]!.status;
    expect(status.stress).toBe(9);
    expect(status.wealth).toBe(7_500_000 - 250_000 - doom.payload.amount);
    expect(revealed.state.players[chosen.playerId]!.eliminated).toBe(false);
  });

  it("Doom Spending sekali per ronde per pemain", () => {
    const first = makeGame().public.turnOrder[0]!;
    const game = withStatus(forceTile(makeGame(), "buying-vitamins"), first, { stress: 10 });
    const chosen = choose(game);
    // Level Stress masih >= 9 setelah Doom (10 -> 9), tetapi hanya sekali.
    const revealed = reveal(chosen.state);
    expect(ofType(revealed.events, "doom:triggered")).toHaveLength(1);
    expect(revealed.state.players[first]!.status.stress).toBe(9);
  });

  it("Hutang lebih dari Rp25jt di tengah ronde baru mengeliminasi di Fase Pembalikan", () => {
    const first = makeGame().public.turnOrder[0]!;
    const game = withStatus(forceTile(makeGame(), "buying-vitamins"), first, {
      debt: 25_000_001,
    });
    const chosen = choose(game);
    expect(chosen.state.players[first]!.eliminated).toBe(false);
    expect(ofType(chosen.events, "player:eliminated")).toHaveLength(0);

    const revealed = reveal(chosen.state);
    const player = revealed.state.players[first]!;
    expect(player.eliminated).toBe(true);
    expect(player.eliminatedReason).toBe("bankrupt");
    expect(player.eliminatedAtStep).toBe(2);
    expect(revealed.state.public.eliminated).toContain(first);
    expect(ofType(revealed.events, "player:eliminated")[0]!.payload.reason).toBe("bankrupt");
  });

  it("kekurangan dari Realita saat Hutang 25jt menjadi Hutang lalu Bangkrut di Fase Pembalikan", () => {
    // hanging-out: Rencana -500.000; Realita zonk -750.000, kekurangan 250.000 menjadi Hutang.
    const first = makeGame().public.turnOrder[0]!;
    const game = withStatus(forceTile(makeGame(), "hanging-out"), first, {
      wealth: 1_000_000,
      debt: 25_000_000,
    });
    const chosen = choose(game, new SequenceRandomSource([0, 0.1]));
    expect(chosen.state.players[first]!.status.wealth).toBe(500_000);
    expect(chosen.state.players[first]!.status.debt).toBe(25_000_000);
    expect(chosen.state.players[first]!.eliminated).toBe(false);

    const revealed = reveal(chosen.state);
    const resolved = ofType(revealed.events, "tile:resolved")[0]!.payload;
    expect(resolved.outcome).toBe("zonk");
    expect(resolved.effects).toContainEqual({ stat: "wealth", delta: -750_000 });
    expect(resolved.round).toBe(2);
    expect(resolved.turnId).toBe(chosen.state.pendingRealities[0]!.turnId);
    const player = revealed.state.players[first]!;
    expect(player.status.wealth).toBe(0);
    expect(player.status.debt).toBe(25_250_000);
    expect(player.eliminated).toBe(true);
    expect(player.eliminatedReason).toBe("bankrupt");
    expect(ofType(revealed.events, "player:eliminated")[0]!.payload.reason).toBe("bankrupt");
    expect(revealed.state.pendingRealities).toEqual([]);
  });

  it("Hutang tepat Rp25jt setelah Fase Pembalikan belum Bangkrut", () => {
    const first = makeGame().public.turnOrder[0]!;
    const game = withStatus(forceTile(makeGame(), "hanging-out"), first, {
      wealth: 1_000_000,
      debt: 25_000_000,
    });
    const revealed = reveal(choose(game).state);
    const player = revealed.state.players[first]!;
    expect(player.status.debt).toBe(25_000_000);
    expect(player.eliminated).toBe(false);
  });

  it("Bangkrut: Doom saat Hutang 25jt dan Kekayaan 0", () => {
    const first = makeGame().public.turnOrder[0]!;
    const game = withStatus(forceTile(makeGame(), "buying-vitamins"), first, {
      wealth: 0,
      debt: 25_000_000,
      stress: 10,
    });
    const revealed = reveal(choose(game).state);
    expect(ofType(revealed.events, "doom:triggered")).toHaveLength(1);
    const player = revealed.state.players[first]!;
    expect(player.eliminated).toBe(true);
    expect(player.eliminatedReason).toBe("bankrupt");
    expect(player.eliminatedAtStep).toBe(2);
    expect(revealed.state.public.eliminated).toContain(first);
    expect(ofType(revealed.events, "player:eliminated")[0]!.payload.reason).toBe("bankrupt");
  });

  it("Burnout: Kesehatan 0 setelah Rencana baru mengeliminasi di Fase Pembalikan", () => {
    // quick-freelance: Kesehatan -1 dari Kesehatan 1.
    const first = makeGame().public.turnOrder[0]!;
    const game = withStatus(forceTile(makeGame(), "quick-freelance"), first, { health: 1 });
    const chosen = choose(game);
    expect(chosen.state.players[first]!.status.health).toBe(0);
    expect(chosen.state.players[first]!.eliminated).toBe(false);

    const revealed = reveal(chosen.state);
    expect(revealed.state.players[first]!.eliminatedReason).toBe("burnout");
    expect(ofType(revealed.events, "player:eliminated")[0]!.payload.reason).toBe("burnout");
  });

  it("eliminasi membekukan skor: frozenScore di player:eliminated, PlayerState, dan Papan Skor", () => {
    const first = makeGame().public.turnOrder[0]!;
    const game = withStatus(forceTile(makeGame(), "quick-freelance"), first, { health: 1 });
    const result = reveal(choose(game).state);
    const player = result.state.players[first]!;
    const frozen = calculateWelfareScore(player.status).score;
    const payload = ofType(result.events, "player:eliminated")[0]!.payload;
    expect(payload.frozenScore).toBeCloseTo(frozen, 9);
    expect(player.frozenScore).toBeCloseTo(frozen, 9);
    const row = result.state.public.scores.find((r) => r.playerId === first)!;
    expect(row.eliminated).toBe(true);
    expect(row.provisionalScore).toBeCloseTo(frozen, 9);

    // Status berubah setelah eliminasi tidak mengubah skor di Papan Skor / peringkat akhir.
    const tampered: GameState = {
      ...result.state,
      players: {
        ...result.state.players,
        [first]: { ...player, status: { ...player.status, wealth: 99_000_000, health: 10 } },
      },
    };
    const finished = ofType(finishGame(tampered).events, "game:finished")[0]!.payload.ranking;
    expect(finished.find((r) => r.playerId === first)?.finalScore).toBeCloseTo(frozen, 9);
  });

  it("mengambil Petak Emas: Rencana apa adanya (tak dikali), tanpa Realita, gold kosong", () => {
    // Beasiswa Penuh: Kekayaan +7.500.000, Level Stress -2 (nilai Multiplayer, tak dikali).
    const base = makeGame(5);
    const first = base.public.turnOrder[0]!;
    const { state: withGold, goldHex } = placeGoldNear(base, first);
    const { state: begun, playerId, turnId } = begin(withGold);
    const before = begun.players[playerId]!.status;
    const state: GameState = {
      ...begun,
      players: {
        ...begun.players,
        [playerId]: { ...begun.players[playerId]!, status: { ...before, stress: 5 } },
      },
    };

    const result = chooseHex(state, playerId, turnId, goldHex, safeRandom());
    if (!result.ok) throw new Error(result.message);

    // Rencana diterapkan apa adanya: +7.500.000 (bukan 15.000.000), Stress -2.
    const status = result.state.players[playerId]!.status;
    expect(status.wealth).toBe(before.wealth + 7_500_000);
    expect(status.stress).toBe(3);

    // Petak Emas tak punya Realita.
    expect(ofType(result.events, "tile:resolved")).toHaveLength(0);
    expect(result.state.pendingRealities).toEqual([]);
    const opened = ofType(result.events, "tile:opened")[0]!.payload;
    expect(opened.isGold).toBe(true);
    expect(opened.title).toBe("Beasiswa Penuh");

    // Petak Emas terambil: public.gold kosong, heksa masuk openedHexes & dipakai.
    expect(result.state.public.gold).toBeNull();
    expect(result.state.board.usedHexKeys).toContain(hexKey(goldHex));
    expect(pawnOf(result.state, playerId)).toEqual(goldHex);
    // Tak ada gold:expired untuk Petak Emas yang diambil.
    expect(ofType(result.events, "gold:expired")).toHaveLength(0);
  });
});

describe("timeoutTurn", () => {
  it("memilih salah satu opsi dengan autoPicked true", () => {
    const { state, turnId } = begin(makeGame());
    const lit = state.pendingTurn!.options.map(hexKey);
    const result = timeoutTurn(state, turnId, seeded());
    if (!result.ok) throw new Error(result.message);
    const opened = ofType(result.events, "tile:opened")[0]!.payload;
    expect(opened.autoPicked).toBe(true);
    expect(lit).toContain(hexKey(opened.to));
  });

  it("turnId lama -> STALE_VERSION", () => {
    const { state } = begin(makeGame());
    const result = timeoutTurn(state, "turn-lama", seeded());
    expect(result.ok ? "ok" : result.code).toBe("STALE_VERSION");
  });
});

describe("endRound (Fase Pembalikan)", () => {
  it("langkah berikutnya dengan phase roundStart, klien masih di fase reveal", () => {
    const game = makeGame(5);
    game.public = { ...game.public, activePlayerId: "c" };
    const { state, events } = endRound(game, seeded());
    expect(state.public.calendar.step).toBe(6);
    expect(state.phase).toBe("roundStart");
    expect(state.public.phase).toBe("reveal");
    expect(state.public.activePlayerId).toBeNull();
    expect(events.map((e) => e.type)).toEqual(["round:reveal", "game:patch"]);
  });

  it("urutan event: round:reveal, tile:resolved + player:status, Doom, eliminasi, game:patch", () => {
    const order = makeGame().public.turnOrder;
    let state = forceTile(makeGame(), "buying-vitamins");
    state = withStatus(state, order[0]!, { stress: 10 }); // Doom
    state = withStatus(state, order[1]!, { debt: 26_000_000 }); // Bangkrut
    const random = safeRandom();
    for (let i = 0; i < 3; i += 1) state = choose(state, random).state;

    const { events, state: after } = endRound(state, new SequenceRandomSource([0.5]));
    const types = events.map((e) => e.type);
    expect(types).toEqual([
      "round:reveal",
      "tile:resolved",
      "player:status",
      "tile:resolved",
      "player:status",
      "tile:resolved",
      "player:status",
      "doom:triggered",
      "player:status",
      "player:eliminated",
      "game:patch",
    ]);
    const reveal = ofType(events, "round:reveal")[0]!;
    expect(reveal.payload).toMatchObject({ round: 2, step: 2 });
    expect(reveal.payload.order.map((o) => o.playerId)).toEqual(order);
    expect(ofType(events, "tile:resolved").map((e) => e.payload.playerId)).toEqual(order);
    expect(after.public.openedHexes.every((h) => h.reality !== null && h.outcome !== null)).toBe(true);
    expect(after.pendingRealities).toEqual([]);
    expect(after.phase).toBe("roundStart");
    expect(after.movedThisRound).toEqual([]);
  });

  it("round:reveal hanya memuat pemain yang melangkah", () => {
    const chosen = choose(forceTile(makeGame(), "buying-vitamins"));
    const { events } = endRound(chosen.state, seeded());
    const reveal = ofType(events, "round:reveal")[0]!.payload;
    expect(reveal.order).toEqual([
      { playerId: chosen.playerId, hex: pawnOf(chosen.state, chosen.playerId) },
    ]);
    expect(ofType(events, "tile:resolved")).toHaveLength(1);
  });

  it("dua pemain tereliminasi di Fase Pembalikan yang sama diurutkan menurut skor beku", () => {
    const order = makeGame().public.turnOrder;
    let state = forceTile(makeGame(), "quick-freelance");
    state = withStatus(state, order[0]!, { health: 1, wealth: 3_000_000 });
    state = withStatus(state, order[1]!, { health: 1, wealth: 7_500_000 });
    const random = safeRandom();
    for (let i = 0; i < 3; i += 1) state = choose(state, random).state;

    const revealed = endRound(state, seeded());
    expect(revealed.nextAction).toBe("finished");
    const eliminated = ofType(revealed.events, "player:eliminated");
    expect(eliminated).toHaveLength(2);
    const [low, high] = [order[0]!, order[1]!];
    expect(revealed.state.players[high]!.frozenScore!).toBeGreaterThan(
      revealed.state.players[low]!.frozenScore!,
    );
    const ranking = ofType(revealed.events, "game:finished")[0]!.payload.ranking;
    expect(ranking.map((r) => r.playerId)).toEqual([order[2], high, low]);
  });

  it("langkah 24: Fase Pembalikan tetap berjalan, eliminasi dicek sebelum game:finished", () => {
    const first = makeGame(24).public.turnOrder[0]!;
    const base = withStatus(forceTile(makeGame(24), "quick-freelance"), first, { health: 1 });
    const chosen = choose(base);
    const { events, state } = endRound(chosen.state, seeded());
    const types = events.map((e) => e.type);
    expect(types.indexOf("round:reveal")).toBe(0);
    expect(types).toContain("tile:resolved");
    expect(types.indexOf("player:eliminated")).toBeGreaterThan(types.indexOf("tile:resolved"));
    expect(types.indexOf("game:patch")).toBeGreaterThan(types.indexOf("player:eliminated"));
    expect(types.at(-1)).toBe("game:finished");
    expect(state.phase).toBe("finished");
    expect(state.public.phase).toBe("finished");
    const ranking = ofType(events, "game:finished")[0]!.payload.ranking;
    expect(ranking.find((r) => r.playerId === first)!.eliminated).toBe(true);
  });

  it("langkah 24 selesai -> game:finished dengan peringkat", () => {
    const game = makeGame(24);
    const { state, events } = endRound(game, seeded());
    expect(state.phase).toBe("finished");
    const finished = ofType(events, "game:finished")[0]!;
    expect(finished.target).toEqual({ kind: "room" });
    expect(finished.payload.ranking).toHaveLength(3);
    expect(finished.payload.ranking.map((r) => r.rank)).toContain(1);
    for (const row of finished.payload.ranking) {
      expect(row.netWorth).toBe(7_500_000);
      expect(row.modifier).toBe("none");
      expect(row.modifierPct).toBe(0);
      expect(row.finalScore).toBeCloseTo(88.3333333, 5);
      expect(row.points?.finance).toBeCloseTo(65, 9);
      expect(row.points?.health).toBe(100);
      expect(row.points?.calm).toBe(100);
      expect(row).not.toHaveProperty("avatarId");
    }
  });

  it("game:finished memuat avatarId bila identitas pemain memilikinya", () => {
    const game = makeGame(24);
    const identities = {
      a: { name: "A", pawn: "cream-circle" as const, avatarId: "michael" },
      b: { name: "B", pawn: "iceblue-square" as const },
    };
    const { events } = finishGame(game, identities);
    const ranking = ofType(events, "game:finished")[0]!.payload.ranking;
    expect(ranking.find((r) => r.playerId === "a")?.avatarId).toBe("michael");
    expect(ranking.find((r) => r.playerId === "b")).not.toHaveProperty("avatarId");
  });
});

describe("game selesai lebih cepat (GDD 1.2 v1.10)", () => {
  it("3 pemain, dua Burnout di ronde yang sama -> selesai di Fase Pembalikan", () => {
    const order = makeGame().public.turnOrder;
    let state = forceTile(makeGame(), "quick-freelance");
    state = withStatus(state, order[0]!, { health: 1 });
    state = withStatus(state, order[1]!, { health: 1 });

    const r1 = choose(state);
    expect(r1.nextAction).toBe("nextTurn");
    const r2 = choose(r1.state);
    // Eliminasi belum terjadi di tengah ronde.
    expect(r2.nextAction).toBe("nextTurn");
    expect(r2.state.phase).not.toBe("finished");
    const r3 = choose(r2.state);
    expect(r3.nextAction).toBe("endRound");

    const ended = endRound(r3.state, seeded());
    expect(ended.nextAction).toBe("finished");
    expect(ended.state.phase).toBe("finished");
    const ranking = ofType(ended.events, "game:finished")[0]!.payload.ranking;
    expect(ranking.find((row) => row.playerId === order[2])?.rank).toBe(1);
  });

  it("timeoutTurn yang membuat Kesehatan 0 tidak langsung mengeliminasi", () => {
    const { state: created } = createGame(
      ["a", "b"],
      "g",
      new SequenceRandomSource([0.1, 0.5, 0.9]),
    );
    let state: GameState = {
      ...created,
      phase: "turn",
      public: { ...created.public, calendar: getCalendarInfo(2) },
    };
    state = forceTile(state, "quick-freelance");
    const first = state.public.turnOrder[0]!;
    state = withStatus(state, first, { health: 1 });
    const started = begin(state);
    const result = timeoutTurn(started.state, started.turnId, safeRandom());
    if (!result.ok) throw new Error(result.message);
    expect(result.nextAction).toBe("nextTurn");
    expect(ofType(result.events, "game:finished")).toHaveLength(0);

    const second = choose(result.state);
    expect(second.nextAction).toBe("endRound");
    const ended = endRound(second.state, seeded());
    expect(ended.nextAction).toBe("finished");
    expect(ofType(ended.events, "game:finished")).toHaveLength(1);
  });

  it("checkEarlyFinish: null bila >= 2 pemain hidup", () => {
    expect(checkEarlyFinish(makeGame())).toBeNull();
  });
});
