import { createGame, SequenceRandomSource, type CalendarChoiceId } from "@pejuang/engine";
import { InviteResolvedPayloadSchema, PublicGameStateSchema } from "@pejuang/shared";
import { describe, expect, it } from "vitest";
import { DEADLINE_GRACE_MS, GameSession, INVITE_SECONDS } from "./game-session";
import type { ServerEvent } from "./event-dispatcher";
import { ManualClock } from "./test-clock";

const REVEAL_STEP_MS = 400;
const MONTH_PAY_SECONDS = 15;
const POPUP_INFO_MS = 900;
const RESULT_POPUP_MS = 250;
const IDS = ["a", "b", "c"];
const SKIP = "skip" as CalendarChoiceId;

/** Sesi tanpa socket: event dikumpulkan dan dicatat seperti yang dilakukan dispatcher. */
function setup() {
  const clock = new ManualClock();
  const sent: ServerEvent[] = [];
  const random = new SequenceRandomSource([0.1, 0.5, 0.9, 0.3, 0.7]);
  const { state } = createGame(IDS, "g1", random);
  const session: GameSession = new GameSession("UMR-1234", state, random, 30, {}, {
    clock,
    timing: {
      revealStepMs: REVEAL_STEP_MS,
      monthPaySeconds: MONTH_PAY_SECONDS,
      popupInfoMs: POPUP_INFO_MS,
      resultPopupMs: RESULT_POPUP_MS,
    },
    send: (events) => {
      for (const event of events) {
        sent.push(event);
        session.recordEvent(event, event.payload);
      }
    },
    onFinished: () => undefined,
  });
  session.start();
  const ofType = <T extends ServerEvent["type"]>(type: T) =>
    sent.filter((event): event is Extract<ServerEvent, { type: T }> => event.type === type);
  const phaseOps = () =>
    ofType("game:patch").flatMap((event) =>
      event.payload.ops.flatMap((op) => (op.type === "phase" ? [op.phase] : [])),
    );
  const busyOps = () =>
    ofType("game:patch").flatMap((event) =>
      event.payload.ops.flatMap((op) => (op.type === "inviteBusy" ? [op.playerIds] : [])),
    );
  return { clock, session, sent, ofType, phaseOps, busyOps };
}
type Ctx = ReturnType<typeof setup>;

/** Menjawab Event Tanggal ronde ini (bila ada) sampai giliran pertama berjalan. */
function skipCalendar(ctx: Ctx) {
  const open = ctx.session.state.pendingCalendarEvent;
  if (!open) return;
  for (const id of IDS) ctx.session.answerCalendar(id, open.eventId, SKIP);
}

const pending = (ctx: Ctx) => ctx.session.state.pendingTurn!;

function move(ctx: Ctx) {
  const turn = pending(ctx);
  return ctx.session.move(turn.playerId, turn.turnId, turn.options[0]!, turn.mode === "deadEnd" ? "jump" : "choose");
}

function giveCard(ctx: Ctx, playerId: string, motive: "sincere" | "commission") {
  const { session } = ctx;
  const player = session.state.players[playerId]!;
  const card = {
    cardId: `card-${playerId}`,
    plan: "hangout" as const,
    planEffects: [{ stat: "stress" as const, delta: -3 }],
    motive,
    expiresAtMonth: 3,
  };
  session.state = {
    ...session.state,
    players: { ...session.state.players, [playerId]: { ...player, inviteCard: card } },
  };
  return card.cardId;
}

describe("deadline + grace: turn:choose", () => {
  it("diterima tepat pada deadline + 500 ms", () => {
    const ctx = setup();
    skipCalendar(ctx);
    const turn = pending(ctx);
    const deadline = ctx.ofType("turn:start").at(-1)!.payload.deadline;
    ctx.clock.advance(deadline + DEADLINE_GRACE_MS - ctx.clock.now());
    expect(move(ctx)).toEqual({ ok: true });
    const opened = ctx.ofType("tile:opened").filter((e) => e.payload.turnId === turn.turnId);
    expect(opened).toHaveLength(1);
    expect(opened[0]!.payload.autoPicked).toBe(false);
  });

  it("sesudah deadline + 500 ms giliran dipilih otomatis sekali, jawaban terlambat ditolak", () => {
    const ctx = setup();
    skipCalendar(ctx);
    const turn = pending(ctx);
    const deadline = ctx.ofType("turn:start").at(-1)!.payload.deadline;
    ctx.clock.advance(deadline + DEADLINE_GRACE_MS + 1 - ctx.clock.now());
    const opened = () => ctx.ofType("tile:opened").filter((e) => e.payload.turnId === turn.turnId);
    expect(opened()).toHaveLength(1);
    expect(opened()[0]!.payload.autoPicked).toBe(true);

    const before = ctx.session.state;
    expect(ctx.session.move(turn.playerId, turn.turnId, turn.options[0]!, "choose").ok).toBe(false);
    expect(ctx.session.state).toBe(before);
    expect(opened()).toHaveLength(1);
  });
});

describe("deadline + grace: calendar:answer", () => {
  it("diterima tepat pada deadline + 500 ms", () => {
    const ctx = setup();
    const event = ctx.session.state.pendingCalendarEvent!;
    const deadline = ctx.ofType("calendar:event")[0]!.payload.deadline;
    ctx.clock.advance(deadline + DEADLINE_GRACE_MS - ctx.clock.now());
    expect(ctx.session.answerCalendar("a", event.eventId, SKIP)).toEqual({ ok: true });
    expect(ctx.session.state.pendingCalendarEvent?.answers).toHaveProperty("a");
  });

  it("sesudah deadline + 500 ms default diterapkan sekali dan jawaban terlambat ditolak", () => {
    const ctx = setup();
    const event = ctx.session.state.pendingCalendarEvent!;
    const deadline = ctx.ofType("calendar:event")[0]!.payload.deadline;
    ctx.clock.advance(deadline + DEADLINE_GRACE_MS + 1 - ctx.clock.now());
    const results = () =>
      ctx.ofType("calendar:result").filter((e) => e.target.kind === "player" && e.target.playerId === "a");
    expect(results()).toHaveLength(1);
    expect(results()[0]!.payload.autoChosen).toBe(true);

    const before = ctx.session.state;
    expect(ctx.session.answerCalendar("a", event.eventId, SKIP)).toMatchObject({
      ok: false,
      error: "EVENT_CLOSED",
    });
    expect(ctx.session.state).toBe(before);
    expect(results()).toHaveLength(1);
  });
});

describe("deadline + grace: month:pay-debt", () => {
  /** Langkah 3 = Ganti Bulan ke bulan 2; pemain "a" punya Hutang. */
  function openMonth() {
    const ctx = setup();
    const { session } = ctx;
    const player = session.state.players.a!;
    session.state = {
      ...session.state,
      phase: "roundStart",
      nextStep: 3,
      players: { ...session.state.players, a: { ...player, status: { ...player.status, debt: 4_000_000 } } },
    };
    // Calendar timer ronde 1 dibersihkan dengan menjawab Event Tanggal lebih dulu tidak perlu:
    // runRound dipanggil langsung, seperti saat jeda Fase Pembalikan selesai.
    (session as unknown as { runRound(): void }).runRound();
    expect(session.state.phase).toBe("batch");
    const summary = ctx
      .ofType("month:summary")
      .find((e) => e.target.kind === "player" && e.target.playerId === "a")!;
    return { ctx, deadline: summary.payload.deadline };
  }

  it("diterima tepat pada deadline + 500 ms", () => {
    const { ctx, deadline } = openMonth();
    ctx.clock.advance(deadline + DEADLINE_GRACE_MS - ctx.clock.now());
    expect(ctx.session.payMonthDebt("a", 2, 1_000_000)).toMatchObject({ ok: true, paid: 1_000_000 });
    expect(ctx.session.state.players.a!.status.debt).toBe(3_000_000);
  });

  it("sesudah deadline + 500 ms popup ditutup sekali dan pembayaran terlambat ditolak", () => {
    const { ctx, deadline } = openMonth();
    ctx.clock.advance(deadline + DEADLINE_GRACE_MS + 1 - ctx.clock.now());
    expect(ctx.session.state.phase).not.toBe("batch");
    const before = ctx.session.state;
    expect(ctx.session.payMonthDebt("a", 2, 1_000_000)).toMatchObject({ ok: false, error: "PAYMENT_CLOSED" });
    expect(ctx.session.state).toBe(before);
    expect(ctx.session.state.players.a!.status.debt).toBe(4_000_000);
  });
});

describe("deadline + grace: invite:respond", () => {
  function sendFromActive(ctx: Ctx) {
    skipCalendar(ctx);
    const turn = pending(ctx);
    const target = IDS.find((id) => id !== turn.playerId)!;
    const cardId = giveCard(ctx, turn.playerId, "commission");
    const ack = ctx.session.sendInvite(turn.playerId, cardId, target, turn.turnId);
    if (!ack.ok) throw new Error(`sendInvite gagal: ${ack.error}`);
    return { target, ack };
  }

  it("diterima tepat pada deadline + 500 ms", () => {
    const ctx = setup();
    const { target, ack } = sendFromActive(ctx);
    ctx.clock.advance(ack.deadline + DEADLINE_GRACE_MS - ctx.clock.now());
    expect(ctx.session.respondInvite(target, ack.inviteId, "join")).toEqual({ ok: true });
    expect(ctx.session.state.roundInvites[0]).toMatchObject({ answer: "join", autoDeclined: false });
  });

  it("sesudah deadline + 500 ms Tolak otomatis sekali dan jawaban terlambat ditolak", () => {
    const ctx = setup();
    const { target, ack } = sendFromActive(ctx);
    expect(ack.deadline - ctx.clock.now()).toBe(INVITE_SECONDS * 1000);
    ctx.clock.advance(ack.deadline + DEADLINE_GRACE_MS + 1 - ctx.clock.now());
    expect(ctx.session.state.roundInvites[0]).toMatchObject({ answer: "decline", autoDeclined: true });
    const before = ctx.session.state;
    expect(ctx.session.respondInvite(target, ack.inviteId, "join")).toMatchObject({
      ok: false,
      error: "INVITE_EXPIRED",
    });
    expect(ctx.session.state).toBe(before);
  });
});

describe("kontrak v0.5: revealEndsAt, op phase, inviteBusy, inviteResults", () => {
  function playRound(ctx: Ctx) {
    skipCalendar(ctx);
    while (ctx.session.state.phase === "turn") expect(move(ctx)).toEqual({ ok: true });
  }

  it("round:reveal dan state publik membawa revealEndsAt; null di luar fase reveal", () => {
    const ctx = setup();
    expect(ctx.session.publicState().revealEndsAt).toBeNull();
    playRound(ctx);
    const reveal = ctx.ofType("round:reveal").at(-1)!.payload;
    expect(reveal.revealEndsAt).toBe(ctx.clock.now() + REVEAL_STEP_MS * reveal.order.length);
    const publicState = ctx.session.publicState();
    expect(publicState.phase).toBe("reveal");
    expect(publicState.revealEndsAt).toBe(reveal.revealEndsAt);
    expect(PublicGameStateSchema.safeParse(publicState).success).toBe(true);

    ctx.clock.advance(REVEAL_STEP_MS * reveal.order.length);
    // Langkah 2 tanpa Event Tanggal: dari reveal langsung ke giliran.
    expect(ctx.session.publicState().phase).toBe("turn");
    expect(ctx.session.publicState().revealEndsAt).toBeNull();
  });

  it("server mengirim game:patch phase setiap public.phase berubah, tanpa duplikat", () => {
    const ctx = setup();
    expect(ctx.phaseOps()).toEqual([]);
    skipCalendar(ctx);
    expect(ctx.phaseOps()).toEqual(["turn"]);
    while (ctx.session.state.phase === "turn") move(ctx);
    expect(ctx.phaseOps()).toEqual(["turn", "reveal"]);
    ctx.clock.advance(REVEAL_STEP_MS * IDS.length);
    const ops = ctx.phaseOps();
    expect(ops).toEqual(["turn", "reveal", "turn"]);
    for (let i = 1; i < ops.length; i += 1) expect(ops[i]).not.toBe(ops[i - 1]);
    expect(ops.at(-1)).toBe(ctx.session.publicState().phase);
  });

  it("inviteBusy berisi id target saja dan dikirim setiap daftar berubah", () => {
    const ctx = setup();
    skipCalendar(ctx);
    const turn = pending(ctx);
    const target = IDS.find((id) => id !== turn.playerId)!;
    expect(ctx.session.publicState().inviteBusyPlayerIds).toEqual([]);
    const ack = ctx.session.sendInvite(turn.playerId, giveCard(ctx, turn.playerId, "commission"), target, turn.turnId);
    if (!ack.ok) throw new Error("sendInvite gagal");
    expect(ctx.busyOps()).toEqual([[target]]);
    expect(ctx.session.publicState().inviteBusyPlayerIds).toEqual([target]);

    // Tidak ada motif, isi, atau pengirim di state publik maupun di patch.
    const leaked = JSON.stringify([ctx.session.publicState(), ctx.ofType("game:patch").map((e) => e.payload)]);
    for (const secret of ["commission", "sincere", "hangout", "planEffects", "fromPlayerId", "motive"]) {
      expect(leaked).not.toContain(secret);
    }

    expect(ctx.session.respondInvite(target, ack.inviteId, "join")).toEqual({ ok: true });
    expect(ctx.busyOps()).toEqual([[target], []]);
    expect(ctx.session.publicState().inviteBusyPlayerIds).toEqual([]);
  });

  it("Ajakan habis waktu juga mengosongkan inviteBusy", () => {
    const ctx = setup();
    skipCalendar(ctx);
    const turn = pending(ctx);
    const target = IDS.find((id) => id !== turn.playerId)!;
    const ack = ctx.session.sendInvite(turn.playerId, giveCard(ctx, turn.playerId, "sincere"), target, turn.turnId);
    if (!ack.ok) throw new Error("sendInvite gagal");
    ctx.clock.advance(ack.deadline + DEADLINE_GRACE_MS + 1 - ctx.clock.now());
    expect(ctx.busyOps()).toEqual([[target], []]);
  });

  it("me.inviteResults berisi invite:resolved pemain itu sampai ronde berikutnya mulai", () => {
    const ctx = setup();
    skipCalendar(ctx);
    const turn = pending(ctx);
    const sender = turn.playerId;
    const target = IDS.find((id) => id !== sender)!;
    const bystander = IDS.find((id) => id !== sender && id !== target)!;
    const ack = ctx.session.sendInvite(sender, giveCard(ctx, sender, "commission"), target, turn.turnId);
    if (!ack.ok) throw new Error("sendInvite gagal");
    expect(ctx.session.respondInvite(target, ack.inviteId, "join")).toEqual({ ok: true });
    expect(ctx.session.inviteResultsFor(target)).toEqual([]);

    while (ctx.session.state.phase === "turn") expect(move(ctx)).toEqual({ ok: true });
    expect(ctx.session.state.public.phase).toBe("reveal");

    const forTarget = ctx.session.inviteResultsFor(target);
    expect(forTarget).toHaveLength(1);
    expect(InviteResolvedPayloadSchema.safeParse(forTarget[0]).success).toBe(true);
    expect(forTarget[0]).toMatchObject({ inviteId: ack.inviteId, answer: "join", motive: "commission" });
    expect(ctx.session.inviteResultsFor(sender)).toHaveLength(1);
    expect(ctx.session.inviteResultsFor(bystander)).toEqual([]);

    // Ada kartu hasil pribadi (invite:resolved): jeda = animasi + RESULT_POPUP_MS (GDD 4.2 v1.14).
    ctx.clock.advance(REVEAL_STEP_MS * IDS.length);
    expect(ctx.session.state.public.phase).toBe("reveal");
    expect(ctx.session.state.public.calendar.step).toBe(1);
    ctx.clock.advance(RESULT_POPUP_MS);
    expect(ctx.session.state.public.calendar.step).toBe(2);
    expect(ctx.session.inviteResultsFor(target)).toEqual([]);
    expect(ctx.session.inviteResultsFor(sender)).toEqual([]);
  });
});

describe("jeda Fase Pembalikan (GDD 4.2 v1.14)", () => {
  function playRound(ctx: Ctx) {
    skipCalendar(ctx);
    while (ctx.session.state.phase === "turn") expect(move(ctx)).toEqual({ ok: true });
  }

  it("round:reveal.resultsDeadline = revealEndsAt + RESULT_POPUP_MS, selalu dikirim (dengan dan tanpa kartu)", () => {
    const plain = setup();
    playRound(plain);
    const a = plain.ofType("round:reveal").at(-1)!.payload;
    expect(a.resultsDeadline).toBe(a.revealEndsAt! + RESULT_POPUP_MS);
    expect(a.revealEndsAt).toBe(plain.clock.now() + REVEAL_STEP_MS * IDS.length);

    const doom = setup();
    skipCalendar(doom);
    const players = { ...doom.session.state.players };
    for (const id of IDS) players[id] = { ...players[id]!, status: { ...players[id]!.status, stress: 10 } };
    doom.session.state = { ...doom.session.state, players };
    while (doom.session.state.phase === "turn") expect(move(doom)).toEqual({ ok: true });
    expect(doom.sent.some((e) => e.type === "doom:triggered")).toBe(true);
    const b = doom.ofType("round:reveal").at(-1)!.payload;
    expect(b.resultsDeadline).toBe(b.revealEndsAt! + RESULT_POPUP_MS);
    expect(b.revealEndsAt).toBe(doom.clock.now() + REVEAL_STEP_MS * IDS.length);
  });

  it("tanpa kartu hasil pribadi: jeda tetap revealStepMs x jumlah pemain", () => {
    const ctx = setup();
    playRound(ctx);
    const cards = ctx.sent.filter((e) => ["invite:resolved", "doom:triggered", "player:eliminated"].includes(e.type));
    expect(cards).toEqual([]);
    ctx.clock.advance(REVEAL_STEP_MS * IDS.length);
    expect(ctx.session.state.public.calendar.step).toBe(2);
  });

  it("ada Doom Spending: jeda ditambah RESULT_POPUP_MS", () => {
    const ctx = setup();
    skipCalendar(ctx);
    const players = { ...ctx.session.state.players };
    for (const id of IDS) players[id] = { ...players[id]!, status: { ...players[id]!.status, stress: 10 } };
    ctx.session.state = { ...ctx.session.state, players };
    while (ctx.session.state.phase === "turn") expect(move(ctx)).toEqual({ ok: true });
    expect(ctx.sent.some((e) => e.type === "doom:triggered")).toBe(true);
    ctx.clock.advance(REVEAL_STEP_MS * IDS.length);
    expect(ctx.session.state.public.calendar.step).toBe(1);
    ctx.clock.advance(RESULT_POPUP_MS);
    expect(ctx.session.state.public.calendar.step).toBe(2);
  });
});

describe("kontrak v0.6: revealOrder, revealStepMs, eliminationReasons, seasonHint", () => {
  function playRound(ctx: Ctx) {
    skipCalendar(ctx);
    while (ctx.session.state.phase === "turn") expect(move(ctx)).toEqual({ ok: true });
  }

  const patchOps = <T extends string>(ctx: Ctx, type: T) =>
    ctx.ofType("game:patch").flatMap((event) => event.payload.ops.filter((op) => op.type === type));

  it("snapshot di tengah Fase Pembalikan memuat revealOrder dan revealStepMs; kosong di luar reveal", () => {
    const ctx = setup();
    expect(ctx.session.publicState()).toMatchObject({ revealOrder: [], revealStepMs: REVEAL_STEP_MS });
    playRound(ctx);
    const reveal = ctx.ofType("round:reveal").at(-1)!.payload;
    expect(reveal.revealStepMs).toBe(REVEAL_STEP_MS);
    const snapshotGame = ctx.session.publicState();
    expect(snapshotGame.phase).toBe("reveal");
    expect(snapshotGame.revealOrder).toEqual(reveal.order.map((item) => item.playerId));
    expect(snapshotGame.revealOrder).toEqual(snapshotGame.turnOrder.filter((id) => snapshotGame.revealOrder.includes(id)));
    expect(snapshotGame.revealStepMs).toBe(REVEAL_STEP_MS);
    expect(PublicGameStateSchema.safeParse(snapshotGame).success).toBe(true);

    expect(patchOps(ctx, "revealOrder")).toEqual([{ type: "revealOrder", playerIds: snapshotGame.revealOrder }]);
    ctx.clock.advance(REVEAL_STEP_MS * IDS.length);
    expect(ctx.session.publicState().revealOrder).toEqual([]);
    expect(patchOps(ctx, "revealOrder").at(-1)).toEqual({ type: "revealOrder", playerIds: [] });
  });

  it("alasan eliminasi bertahan di snapshot (reconnect) dan dikirim lewat game:patch", () => {
    const ctx = setup();
    skipCalendar(ctx);
    const victim = IDS[1]!;
    const player = ctx.session.state.players[victim]!;
    ctx.session.state = {
      ...ctx.session.state,
      players: { ...ctx.session.state.players, [victim]: { ...player, status: { ...player.status, debt: 40_000_000 } } },
    };
    while (ctx.session.state.phase === "turn") expect(move(ctx)).toEqual({ ok: true });
    const expected = [{ playerId: victim, reason: "bankrupt" }];
    expect(ctx.ofType("player:eliminated").map((event) => event.payload)).toMatchObject([
      { playerId: victim, reason: "bankrupt" },
    ]);
    expect(patchOps(ctx, "eliminationReasons")).toEqual([{ type: "eliminationReasons", reasons: expected }]);

    // Ronde berikutnya mulai: snapshot baru tetap memuat alasan yang sama.
    ctx.clock.advance(REVEAL_STEP_MS * IDS.length);
    const game = ctx.session.publicState();
    expect(game.eliminated).toEqual([victim]);
    expect(game.eliminationReasons).toEqual(expected);
    expect(PublicGameStateSchema.safeParse(game).success).toBe(true);
    expect(patchOps(ctx, "eliminationReasons")).toHaveLength(1);
  });

  it("seasonHint ada di snapshot dan sama dengan hint season:changed", () => {
    const ctx = setup();
    const game = ctx.session.publicState();
    const hint = ctx.ofType("season:changed").at(-1)!.payload.hint;
    expect(game.calendar.seasonHint).toBe(hint);
    expect(game.calendar.seasonHint.length).toBeGreaterThan(0);
  });

  it("state publik tidak membocorkan Realita atau motif", () => {
    const ctx = setup();
    const turn = (skipCalendar(ctx), pending(ctx));
    const sender = turn.playerId;
    const target = IDS.find((id) => id !== sender)!;
    const ack = ctx.session.sendInvite(sender, giveCard(ctx, sender, "commission"), target, turn.turnId);
    if (!ack.ok) throw new Error("sendInvite gagal");
    expect(ctx.session.respondInvite(target, ack.inviteId, "join")).toEqual({ ok: true });
    while (ctx.session.state.phase === "turn") move(ctx);
    const json = JSON.stringify(ctx.session.publicState());
    expect(json).not.toContain("commission");
    expect(json).not.toContain("motive");
    for (const realityText of ctx.session.state.pendingRealities.map((entry) => JSON.stringify(entry))) {
      expect(json).not.toContain(realityText);
    }
  });
});
