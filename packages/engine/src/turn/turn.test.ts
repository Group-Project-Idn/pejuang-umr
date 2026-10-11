import { describe, expect, it } from "vitest";
import {
  getHexDistance,
  getNeighbors,
  hexKey,
  type HexCoord,
  type PrivateStatus,
} from "@pejuang/shared";
import { getCalendarInfo } from "../calendar/calendar";
import { createGame } from "../game/create-game";
import type { DomainEvent } from "../game/domain-events";
import type { GameState } from "../game/game-state";
import { SequenceRandomSource } from "../random";
import { startRound } from "./round";
import { checkEarlyFinish, chooseHex, endRound, startTurn, timeoutTurn } from "./turn";

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

  it("memindahkan pion, membuka heksa, dan mengubah Kekayaan sesuai Rencana + Realita", () => {
    // hanging-out: Rencana Kekayaan -500rb (MP -1.000.000), Realita safe tanpa efek.
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
      outcome: "safe",
    });
    expect(ofType(result.events, "tile:resolved")[0]!.payload.outcome).toBe("safe");
    expect(next.players[playerId]!.status.wealth).toBe(6_500_000);

    expect(ofType(result.events, "player:status")[0]!.target).toEqual({
      kind: "player",
      playerId,
    });
    expect(ofType(result.events, "game:patch")[0]!.payload.ops[0]!.type).toBe("scores");
    expect(next.public.scores).toHaveLength(3);
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

  it("Doom setelah petak saat Level Stress >= 9", () => {
    // buying-vitamins tidak mengubah stress; Realita safe tanpa efek.
    const game = withStatus(
      forceTile(makeGame(), "buying-vitamins"),
      makeGame().public.turnOrder[0]!,
      {
        stress: 10,
      },
    );
    const { state, playerId, turnId } = begin(game);
    const result = chooseHex(state, playerId, turnId, state.pendingTurn!.options[0]!, safeRandom());
    if (!result.ok) throw new Error(result.message);
    const doom = ofType(result.events, "doom:triggered")[0]!;
    expect(doom.target).toEqual({ kind: "player", playerId });
    expect(doom.payload.trigger).toBe("tile");
    expect(doom.payload.stressAfter).toBe(9);
    const status = result.state.players[playerId]!.status;
    expect(status.stress).toBe(9);
    expect(status.wealth).toBe(7_500_000 - 500_000 - doom.payload.amount);
    expect(result.state.players[playerId]!.eliminated).toBe(false);
  });

  it("kekurangan dari Realita saat Hutang 25jt dihapus tanpa eliminasi", () => {
    // hanging-out: Rencana -1.000.000 habis tepat; Realita zonk -1.500.000 melewati limit Hutang.
    const first = makeGame().public.turnOrder[0]!;
    const game = withStatus(forceTile(makeGame(), "hanging-out"), first, {
      wealth: 1_000_000,
      debt: 25_000_000,
    });
    const { state, playerId, turnId } = begin(game);
    const zonk = new SequenceRandomSource([0, 0.1]);
    const result = chooseHex(state, playerId, turnId, state.pendingTurn!.options[0]!, zonk);
    if (!result.ok) throw new Error(result.message);
    const resolved = ofType(result.events, "tile:resolved")[0]!.payload;
    expect(resolved.outcome).toBe("zonk");
    expect(resolved.effects).toContainEqual({
      stat: "wealth",
      delta: -1_500_000,
    });
    const player = result.state.players[playerId]!;
    expect(player.status.wealth).toBe(0);
    expect(player.status.debt).toBe(25_000_000);
    expect(player.eliminated).toBe(false);
    expect(ofType(result.events, "player:eliminated")).toHaveLength(0);
  });

  it("Bangkrut: Doom saat Hutang 25jt dan Kekayaan 0", () => {
    const first = makeGame().public.turnOrder[0]!;
    const game = withStatus(forceTile(makeGame(), "buying-vitamins"), first, {
      wealth: 0,
      debt: 25_000_000,
      stress: 10,
    });
    const { state, playerId, turnId } = begin(game);
    const result = chooseHex(state, playerId, turnId, state.pendingTurn!.options[0]!, safeRandom());
    if (!result.ok) throw new Error(result.message);
    expect(ofType(result.events, "doom:triggered")).toHaveLength(1);
    const player = result.state.players[playerId]!;
    expect(player.eliminated).toBe(true);
    expect(player.eliminatedReason).toBe("bankrupt");
    expect(player.eliminatedAtStep).toBe(2);
    expect(result.state.public.eliminated).toContain(playerId);
    expect(ofType(result.events, "player:eliminated")[0]!.payload.reason).toBe("bankrupt");
  });

  it("Burnout: Kesehatan 0 setelah Rencana", () => {
    // quick-freelance: Kesehatan -1 (MP -2) dari Kesehatan 1.
    const first = makeGame().public.turnOrder[0]!;
    const game = withStatus(forceTile(makeGame(), "quick-freelance"), first, {
      health: 1,
    });
    const { state, playerId, turnId } = begin(game);
    const result = chooseHex(state, playerId, turnId, state.pendingTurn!.options[0]!, safeRandom());
    if (!result.ok) throw new Error(result.message);
    const player = result.state.players[playerId]!;
    expect(player.status.health).toBe(0);
    expect(player.eliminatedReason).toBe("burnout");
    expect(ofType(result.events, "player:eliminated")[0]!.payload.reason).toBe("burnout");
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

describe("endRound", () => {
  it("langkah berikutnya dengan phase roundStart", () => {
    const game = makeGame(5);
    game.public = { ...game.public, activePlayerId: "c" };
    const { state, events } = endRound(game, seeded());
    expect(state.public.calendar.step).toBe(6);
    expect(state.phase).toBe("roundStart");
    expect(state.public.activePlayerId).toBeNull();
    expect(events).toEqual([]);
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
      expect(row.modifier).toBe("bonus");
    }
  });
});

describe("game selesai lebih cepat (GDD 1.2 v1.10)", () => {
  it("3 pemain, dua Burnout di ronde yang sama -> selesai setelah eliminasi kedua", () => {
    const order = makeGame().public.turnOrder;
    let state = forceTile(makeGame(), "quick-freelance");
    state = withStatus(state, order[0]!, { health: 1 });
    state = withStatus(state, order[1]!, { health: 1 });

    const first = begin(state);
    const r1 = chooseHex(
      first.state,
      first.playerId,
      first.turnId,
      first.state.pendingTurn!.options[0]!,
      safeRandom(),
    );
    if (!r1.ok) throw new Error(r1.message);
    expect(r1.nextAction).toBe("nextTurn");
    expect(r1.state.phase).not.toBe("finished");

    const second = begin(r1.state);
    const r2 = chooseHex(
      second.state,
      second.playerId,
      second.turnId,
      second.state.pendingTurn!.options[0]!,
      safeRandom(),
    );
    if (!r2.ok) throw new Error(r2.message);
    expect(r2.nextAction).toBe("finished");
    expect(r2.state.phase).toBe("finished");
    const ranking = ofType(r2.events, "game:finished")[0]!.payload.ranking;
    expect(ranking.find((row) => row.playerId === order[2])?.rank).toBe(1);
  });

  it("timeoutTurn yang menyebabkan eliminasi terakhir juga mengembalikan finished", () => {
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
    expect(result.nextAction).toBe("finished");
    expect(ofType(result.events, "game:finished")).toHaveLength(1);
  });

  it("checkEarlyFinish: null bila >= 2 pemain hidup", () => {
    expect(checkEarlyFinish(makeGame())).toBeNull();
  });
});
