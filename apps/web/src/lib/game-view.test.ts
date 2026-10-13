import type { Snapshot } from "@pejuang/shared";
import { describe, expect, it } from "vitest";
import {
  acceptSnapshot,
  applyGamePatch,
  applyGameStarted,
  applyGoldExpired,
  applyGoldSpawned,
  applyPlayerConnection,
  applyPlayerEliminated,
  applyPublicGameEvent,
  applyRoundReveal,
  applyTileOpened,
  applyTileResolved,
  applyTurnStart,
  getTurnSecondsLeft,
  type GameFinished,
  type GameStarted,
  type GoldSpawned,
  type PlayerEliminated,
  type TileOpened,
  type TileResolved,
  type TurnStart,
} from "./game-view";

function snapshot(version: number): Snapshot {
  return {
    serverTime: version,
    room: {
      code: "UMR-1234",
      status: "playing",
      hostId: "p1",
      turnSeconds: 30,
      players: [],
      maxPlayers: 4,
      canStart: false,
      startBlockReason: "NEED_MIN_PLAYERS",
    },
    game: {
      version,
      gameId: "game-1",
      boardRadius: 6,
      calendar: {
        step: 1,
        totalSteps: 24,
        round: 1,
        month: 1,
        dateLabel: "Januari · Pekan 1",
        season: "rainy",
        seasonHint: "Hujan: petak Kerja lebih rawan",
        nextEvent: null,
      },
      turnOrder: [],
      activePlayerId: null,
      turnDeadline: null,
      revealEndsAt: null,
      revealOrder: [],
      revealStepMs: 2_500,
      eliminationReasons: [],
      inviteBusyPlayerIds: [],
      pawns: [],
      openedHexes: [],
      gold: null,
      scores: [],
      rankOneBurden: [],
      eliminated: [],
      phase: "calendar",
    },
    me: {
      playerId: "p1",
      status: null,
      inviteCard: null,
      pendingTurn: null,
      pendingCalendar: null,
      pendingInvite: null,
      pendingMonth: null,
      inviteResults: [],
      reflection: null,
    },
    result: null,
  };
}

describe("acceptSnapshot", () => {
  it("menerima room waiting tanpa game setelah rematch", () => {
    const next = snapshot(0);
    next.room.status = "waiting";
    next.game = null;
    expect(acceptSnapshot(snapshot(100), next)).toBe(next);
  });

  it("menerima versi awal game baru di room yang sama", () => {
    const next = snapshot(1);
    next.game!.gameId = "game-2";
    expect(acceptSnapshot(snapshot(100), next)).toBe(next);
  });

  it("menerima snapshot room berbeda dan snapshot pertama", () => {
    const next = snapshot(1);
    next.room.code = "UMR-5678";
    expect(acceptSnapshot(snapshot(100), next)).toBe(next);
    expect(acceptSnapshot(null, next)).toBe(next);
  });

  it("mengabaikan snapshot dengan version game yang lebih lama", () => {
    const current = snapshot(3);
    expect(acceptSnapshot(current, snapshot(2))).toBe(current);
    expect(acceptSnapshot(current, snapshot(4)).game?.version).toBe(4);
  });

  it("menerapkan patch game yang lebih baru dan menolak patch stale", () => {
    const game = snapshot(3).game!;
    const patched = applyGamePatch(game, {
      version: 4,
      ops: [
        {
          type: "scores",
          scores: [
            {
              playerId: "p1",
              provisionalScore: 12,
              rank: 1,
              eliminated: false,
            },
          ],
        },
        {
          type: "rankOneBurden",
          playerIds: ["p1"],
        },
      ],
    });
    expect(patched?.version).toBe(4);
    expect(patched?.scores[0]?.provisionalScore).toBe(12);
    expect(patched?.rankOneBurden).toEqual(["p1"]);
    expect(applyGamePatch(patched, { version: 3, ops: [] })).toBe(patched);
  });

  it("op inviteBusy mengganti daftar target sibuk", () => {
    const game = snapshot(3).game!;
    const patched = applyGamePatch(game, {
      version: 4,
      ops: [{ type: "inviteBusy", playerIds: ["p2"] }],
    });
    expect(patched?.inviteBusyPlayerIds).toEqual(["p2"]);
    const cleared = applyGamePatch(patched, {
      version: 5,
      ops: [{ type: "inviteBusy", playerIds: [] }],
    });
    expect(cleared?.inviteBusyPlayerIds).toEqual([]);
  });

  it("op phase mengganti fase dan membuang revealEndsAt di luar reveal", () => {
    const game = { ...snapshot(3).game!, phase: "reveal" as const, revealEndsAt: 12_000 };
    const toTurn = applyGamePatch(game, { version: 4, ops: [{ type: "phase", phase: "turn" }] });
    expect(toTurn).toMatchObject({ phase: "turn", revealEndsAt: null });
    const toReveal = applyGamePatch(game, { version: 4, ops: [{ type: "phase", phase: "reveal" }] });
    expect(toReveal).toMatchObject({ phase: "reveal", revealEndsAt: 12_000 });
    expect(applyGamePatch(game, { version: 4, ops: [{ type: "phase", phase: "finished" }] })?.phase).toBe("finished");
  });
});

describe("game:patch revealOrder dan eliminationReasons", () => {
  it("menerapkan op revealOrder dan eliminationReasons; calendar op mengosongkan revealOrder", () => {
    const game = snapshot(3).game!;
    const patched = applyGamePatch(game, {
      version: game.version + 1,
      ops: [
        { type: "revealOrder", playerIds: ["p2", "p1"] },
        { type: "eliminationReasons", reasons: [{ playerId: "p1", reason: "burnout" }] },
      ],
    })!;
    expect(patched.revealOrder).toEqual(["p2", "p1"]);
    expect(patched.eliminationReasons).toEqual([{ playerId: "p1", reason: "burnout" }]);
    const next = applyGamePatch(patched, {
      version: patched.version + 1,
      ops: [{ type: "calendar", calendar: { ...patched.calendar, seasonHint: "Kemarau: petak Keuangan dan Sosial lebih rawan" } }],
    })!;
    expect(next.revealOrder).toEqual([]);
    expect(next.calendar.seasonHint).toBe("Kemarau: petak Keuangan dan Sosial lebih rawan");
  });
});

describe("reducer event publik (B01)", () => {
  const started: GameStarted = {
    version: 1,
    serverTime: 1_000,
    gameId: "game-1",
    boardRadius: 6,
    turnSeconds: 30,
    revealStepMs: 2_500,
    turnOrder: ["p1", "p2"],
    startPositions: [
      { playerId: "p1", hex: { q: 0, r: 0 } },
      { playerId: "p2", hex: { q: 0, r: 1 } },
    ],
    calendar: {
      step: 1,
      totalSteps: 24,
      round: 1,
      month: 1,
      dateLabel: "Januari · Pekan 1",
      season: "rainy",
      seasonHint: "Hujan: petak Kerja lebih rawan",
      nextEvent: null,
    },
  };

  const turnStart: TurnStart = {
    version: 2,
    turnId: "turn-1",
    playerId: "p1",
    deadline: 31_000,
    turnSeconds: 30,
  };

  const tileOpened: TileOpened = {
    version: 3,
    turnId: "turn-1",
    playerId: "p1",
    from: { q: 0, r: 0 },
    to: { q: 1, r: 0 },
    category: "work",
    title: "Lembur",
    plan: [{ stat: "wealth", delta: 1_000_000 }],
    isGold: false,
    viaJump: false,
    autoPicked: false,
  };

  const resolved: TileResolved = {
    version: 4,
    round: 1,
    playerId: "p1",
    hex: { q: 1, r: 0 },
    outcome: "safe",
    text: "Aman",
    effects: [],
    seasonal: false,
  };

  function baseGame() {
    return applyGameStarted(null, started)!;
  }

  it("membangun state awal dari game:started dan menolak event lebih lama", () => {
    const game = baseGame();
    expect(game.pawns).toHaveLength(2);
    expect(game.pawns[0]).toEqual({ playerId: "p1", hex: { q: 0, r: 0 } });
    expect(game.activePlayerId).toBeNull();
    expect(game.openedHexes).toEqual([]);
    expect(applyGameStarted(game, { ...started, version: 0 })).toBe(game);
  });

  it("mengabaikan semua event publik bila belum ada game", () => {
    expect(applyTurnStart(null, turnStart)).toBeNull();
    expect(applyTileOpened(null, tileOpened)).toBeNull();
    expect(applyTileResolved(null, resolved)).toBeNull();
    expect(
      applyPublicGameEvent(null, { type: "turn:start", payload: turnStart }),
    ).toBeNull();
  });

  it("memindahkan pion dan mencatat heksa terbuka satu kali", () => {
    const game = applyTileOpened(baseGame(), tileOpened)!;
    expect(game.pawns.find((pawn) => pawn.playerId === "p1")?.hex).toEqual({
      q: 1,
      r: 0,
    });
    expect(game.openedHexes).toHaveLength(1);
    expect(game.openedHexes[0]).toMatchObject({
      category: "work",
      title: "Lembur",
      plan: tileOpened.plan,
      reality: null,
      byPlayerId: "p1",
      step: 1,
    });

    const repeated = applyTileOpened(game, {
      ...tileOpened,
      version: 3,
      playerId: "p2",
    })!;
    expect(repeated.openedHexes).toHaveLength(1);
    expect(repeated.openedHexes[0]?.byPlayerId).toBe("p2");
  });

  it("round:reveal menjaga versi dan menutup timer; Realita baru terlihat setelah tile:resolved", () => {
    const chosen = applyTileOpened(applyTurnStart(baseGame(), turnStart), tileOpened)!;
    expect(chosen.openedHexes[0]?.reality).toBeNull();
    const revealed = applyPublicGameEvent(chosen, {
      type: "round:reveal",
      payload: { version: 4, round: 1, step: 1, order: [{ playerId: "p1", hex: tileOpened.to }], revealEndsAt: 12_000, revealStepMs: 1_500, resultsDeadline: 20_000 },
    })!;
    expect(revealed).toMatchObject({
      version: 4, phase: "reveal", activePlayerId: null, turnDeadline: null, revealEndsAt: 12_000,
      revealOrder: ["p1"], revealStepMs: 1_500,
    });
    const nextTurn = applyTurnStart(revealed, { ...turnStart, version: 6 })!;
    expect(nextTurn.revealEndsAt).toBeNull();
    expect(revealed.openedHexes[0]?.reality).toBeNull();
    expect(applyRoundReveal(revealed, { version: 3, round: 1, step: 1, order: [], revealEndsAt: 12_000, revealStepMs: 1_500, resultsDeadline: 20_000 })).toBe(revealed);

    const after = applyTileResolved(revealed, { ...resolved, version: 5, round: 1 })!;
    expect(after.openedHexes[0]?.reality).toEqual({
      outcome: "safe", text: "Aman", effects: [], seasonal: false,
    });
    expect(applyTileResolved(after, { ...resolved, version: 4, round: 1, text: "usang" })).toBe(after);
    const wrongStep = applyTileResolved(revealed, { ...resolved, version: 5, round: 2 })!;
    expect(wrongStep.openedHexes[0]?.reality).toBeNull();
    const wrongPlayer = applyTileResolved(revealed, { ...resolved, version: 5, round: 1, playerId: "p2" })!;
    expect(wrongPlayer.openedHexes[0]?.reality).toBeNull();
  });

  it("menolak event versi lebih lama dan tidak mengulang efek", () => {
    const game = applyTurnStart(baseGame(), turnStart)!;
    expect(game.activePlayerId).toBe("p1");
    expect(game.turnDeadline).toBe(31_000);
    expect(
      applyTurnStart(game, { ...turnStart, version: 1, playerId: "p2" }),
    ).toBe(game);
    expect(applyTileOpened(game, { ...tileOpened, version: 1 })).toBe(game);
    expect(
      applyTileOpened(game, { ...tileOpened, version: 1, playerId: "p2" })
        ?.openedHexes,
    ).toEqual([]);
  });

  it("menghanguskan emas tanpa mengubah heksa tertutup menjadi Heksa Mati", () => {
    const game = applyTileResolved(
      applyTileOpened(baseGame(), tileOpened)!,
      resolved,
    )!;
    expect(game.openedHexes[0]?.reality?.outcome).toBe("safe");

    const spawned = applyGoldSpawned(game, {
      version: 5,
      gold: {
        goldId: "gold-1",
        hex: { q: 2, r: 0 },
        title: "Petak Emas",
        plan: [{ stat: "wealth", delta: 2_000_000 }],
        expiresAtStep: 6,
      },
    } satisfies GoldSpawned)!;
    expect(spawned.gold?.goldId).toBe("gold-1");

    const expired = applyGoldExpired(spawned, {
      version: 6,
      goldId: "gold-1",
      hex: { q: 2, r: 0 },
    })!;
    expect(expired.gold).toBeNull();
    expect(
      applyGoldExpired(expired, {
        version: 7,
        goldId: "gold-lain",
        hex: { q: 3, r: 0 },
      }),
    ).toBe(expired);
  });

  it("menandai eliminasi, membersihkan giliran aktif, dan menyelesaikan game", () => {
    let game = applyTurnStart(baseGame(), turnStart)!;
    game = {
      ...game,
      scores: [
        { playerId: "p1", provisionalScore: 10, rank: 1, eliminated: false },
        { playerId: "p2", provisionalScore: 8, rank: 2, eliminated: false },
      ],
    };
    game = applyPlayerEliminated(game, {
      version: 5,
      playerId: "p1",
      reason: "bankrupt",
      step: 12,
      frozenScore: 40,
    } satisfies PlayerEliminated)!;
    expect(game.eliminated).toEqual(["p1"]);
    expect(game.eliminationReasons).toEqual([{ playerId: "p1", reason: "bankrupt" }]);
    expect(game.scores[0]?.eliminated).toBe(true);
    expect(game.activePlayerId).toBeNull();
    expect(game.turnDeadline).toBeNull();
    expect(
      applyPlayerEliminated(game, {
        version: 6,
        playerId: "p1",
        reason: "bankrupt",
        step: 13,
        frozenScore: 40,
      }),
    ).toBe(game);

    const finished = applyPublicGameEvent(game, {
      type: "game:finished",
      payload: { version: 9, ranking: [] } satisfies GameFinished,
    })!;
    expect(finished).toMatchObject({ phase: "finished", turnDeadline: null });
    expect(finished.version).toBe(9);
  });

  it("mengubah musim tanpa menyentuh langkah kalender", () => {
    const game = applyPublicGameEvent(baseGame(), {
      type: "season:changed",
      payload: {
        version: 4,
        season: "dry",
        vulnerableCategories: ["work"],
        zonkFocus: "sick",
        hint: "Pancaroba: petak Kesehatan lebih rawan",
      },
    })!;
    expect(game.calendar.season).toBe("dry");
    expect(game.calendar.step).toBe(1);
  });

  it("memperbarui status koneksi pemain pada room state", () => {
    const room = snapshot(1).room;
    room.players = [
      {
        playerId: "p1",
        name: "Rina",
        avatarId: "michael",
        connected: true,
        isHost: true,
        ready: false,
        joinedAt: 1,
      },
    ];
    const offline = applyPlayerConnection(room, {
      playerId: "p1",
      connected: false,
      at: 2,
    });
    expect(offline.players[0]?.connected).toBe(false);
    expect(
      applyPlayerConnection(offline, {
        playerId: "p2",
        connected: false,
        at: 3,
      }),
    ).toBe(offline);
  });

  it("menghitung sisa waktu dari turnDeadline dan clock server saja", () => {
    expect(
      getTurnSecondsLeft({
        localNow: 1_000,
        serverClockOffsetMs: 4_000,
        deadline: 15_000,
      }),
    ).toBe(10);
    expect(
      getTurnSecondsLeft({
        localNow: 1_000,
        serverClockOffsetMs: 0,
        deadline: 1_001,
      }),
    ).toBe(1);
    expect(
      getTurnSecondsLeft({
        localNow: 20_000,
        serverClockOffsetMs: 0,
        deadline: 15_000,
      }),
    ).toBe(0);
    expect(
      getTurnSecondsLeft({ localNow: 1_000, serverClockOffsetMs: 0, deadline: null }),
    ).toBe(0);
  });
});
