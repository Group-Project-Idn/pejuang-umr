import type {
  InviteCard,
  InviteIncomingPayload,
  InviteResolvedPayload,
  PublicGameState,
  RoomState,
  Snapshot,
} from "@pejuang/shared";
import { describe, expect, it } from "vitest";
import {
  buildInviteConfirmText,
  buildInviteResultView,
  buildInviteSendPayload,
  canUseInviteCard,
  formatEffects,
  getDisabledInvitePawnIds,
  getInviteErrorMessage,
  getInvitePopup,
  getSelectableInviteTargetIds,
  isInviteExpired,
  isInviteTargetSelectable,
  resolveInviteFlow,
} from "./invites";
import {
  applyInviteCard,
  applyInviteIncoming,
  applyInviteResolved,
  clearAcceptedPrivateAction,
  createRoomSessionView,
  type RoomSessionView,
} from "./room-session-view";

type Me = NonNullable<Snapshot["me"]>;

const card: InviteCard = {
  cardId: "card-1",
  plan: "hangout",
  planEffects: [{ stat: "wealth", delta: -500_000 }, { stat: "stress", delta: -2 }],
  motive: "commission",
  expiresAtMonth: 2,
};

const incoming: InviteIncomingPayload = {
  inviteId: "invite-1-p2",
  fromPlayerId: "p1",
  fromName: "Rina",
  plan: "hangout",
  planEffects: card.planEffects,
  deadline: 25_000,
};

const resolved: InviteResolvedPayload = {
  inviteId: "invite-1-p2",
  fromPlayerId: "p1",
  targetPlayerId: "p2",
  answer: "join",
  autoDeclined: false,
  motive: "commission",
  effectsForYou: [{ stat: "wealth", delta: -1_000_000 }],
};

function makeMe(overrides: Partial<Me> = {}): Me {
  return {
    playerId: "p1",
    status: null,
    inviteCard: card,
    pendingTurn: { turnId: "turn-1", options: [] },
    pendingCalendar: null,
    pendingInvite: null,
    pendingMonth: null,
    inviteResults: [],
    reflection: null,
    ...overrides,
  };
}

function makeGame(overrides: Partial<PublicGameState> = {}): PublicGameState {
  return {
    activePlayerId: "p1",
    eliminated: [],
    inviteBusyPlayerIds: [],
    turnDeadline: 40_000,
    pawns: ["p1", "p2", "p3", "p4"].map((playerId) => ({ playerId, hex: { q: 0, r: 0 } })),
    ...overrides,
  } as PublicGameState;
}

function sessionWith(me: Me): RoomSessionView {
  return { ...createRoomSessionView(), me };
}

describe("tombol Kartu Ajakan", () => {
  it("aktif hanya dengan kartu, giliran sendiri, dan pendingTurn", () => {
    expect(canUseInviteCard(makeMe(), makeGame())).toBe(true);
    expect(canUseInviteCard(makeMe({ inviteCard: null }), makeGame())).toBe(false);
    expect(canUseInviteCard(makeMe(), makeGame({ activePlayerId: "p2" }))).toBe(false);
    expect(canUseInviteCard(makeMe({ pendingTurn: null }), makeGame())).toBe(false);
    expect(canUseInviteCard(makeMe(), makeGame({ eliminated: ["p1"] }))).toBe(false);
    expect(canUseInviteCard(null, makeGame())).toBe(false);
  });
});

describe("pilih target", () => {
  it("diri sendiri, tereliminasi, dan pemain sibuk tidak bisa dipilih", () => {
    const game = makeGame({ eliminated: ["p3"], inviteBusyPlayerIds: ["p2"] });
    expect(isInviteTargetSelectable(game, "p1", "p1")).toBe(false);
    expect(isInviteTargetSelectable(game, "p1", "p2")).toBe(false);
    expect(isInviteTargetSelectable(game, "p1", "p3")).toBe(false);
    expect(isInviteTargetSelectable(game, "p1", "p4")).toBe(true);
    expect(getDisabledInvitePawnIds(game, "p1")).toEqual(["p1", "p2", "p3"]);
    const room = { players: ["p1", "p2", "p3", "p4", "p5"].map((playerId) => ({ playerId })) } as RoomState;
    expect(getSelectableInviteTargetIds(game, room, "p1")).toEqual(["p4"]);
  });

  it("konfirmasi memakai nama dan Rencana", () => {
    expect(buildInviteConfirmText("Dika", "hangout")).toBe("Ajak Dika untuk Ajak Nongkrong?");
  });

  it("payload invite:send membawa turnId dari pendingTurn dan cardId", () => {
    expect(buildInviteSendPayload("req-1", makeMe(), "p4")).toEqual({
      requestId: "req-1",
      turnId: "turn-1",
      cardId: "card-1",
      targetPlayerId: "p4",
    });
    expect(buildInviteSendPayload("req-1", makeMe({ pendingTurn: null }), "p4")).toBeNull();
  });

  it("teks error sesuai API_CONTRACT Bagian 15", () => {
    expect(getInviteErrorMessage("INVITE_NOT_ALLOWED")).toBe("Ajakan hanya bisa dikirim di giliranmu sebelum memilih heksa.");
    expect(getInviteErrorMessage("NO_INVITE_CARD")).toBe("Kamu belum punya Kartu Ajakan.");
    expect(getInviteErrorMessage("INVALID_TARGET")).toBe("Pemain ini tidak bisa dipilih.");
    expect(getInviteErrorMessage("ROOM_FULL")).toBe("Server lagi bermasalah. Coba lagi.");
  });
});

describe("alur kirim batal", () => {
  const flow = { step: "pick", turnId: "turn-1", cardId: "card-1" } as const;

  it("tetap sah sebelum Timer Giliran habis", () => {
    expect(resolveInviteFlow(flow, makeMe(), makeGame(), 39_999)).toEqual(flow);
  });

  it("batal saat Timer Giliran habis, giliran berganti, atau heksa sudah dipilih", () => {
    expect(resolveInviteFlow(flow, makeMe(), makeGame(), 40_000)).toBeNull();
    expect(resolveInviteFlow(flow, makeMe({ pendingTurn: { turnId: "turn-2", options: [] } }), makeGame(), 1)).toBeNull();
    expect(resolveInviteFlow(flow, makeMe({ pendingTurn: null }), makeGame(), 1)).toBeNull();
  });

  it("batal bila target di tahap konfirmasi mendadak sibuk", () => {
    const confirm = { ...flow, step: "confirm", targetPlayerId: "p2" } as const;
    expect(resolveInviteFlow(confirm, makeMe(), makeGame(), 1)).toEqual(confirm);
    expect(resolveInviteFlow(confirm, makeMe(), makeGame({ inviteBusyPlayerIds: ["p2"] }), 1)).toBeNull();
  });
});

describe("popup Ajakan masuk", () => {
  const me = makeMe({ playerId: "p2", inviteCard: null, pendingTurn: null, pendingInvite: incoming });

  it("hitung mundur memakai deadline dan serverClockOffsetMs", () => {
    // waktu server = 10_000 + 5_000 = 15_000, sisa 10 detik.
    expect(getInvitePopup(me, 10_000, 5_000)).toMatchObject({ secondsLeft: 10, compact: false });
    expect(getInvitePopup(me, 10_000, 0)?.secondsLeft).toBe(15);
  });

  it("waktu habis menutup popup dan dihitung kedaluwarsa", () => {
    expect(getInvitePopup(me, 24_001, 0)?.secondsLeft).toBe(1);
    expect(getInvitePopup(me, 25_000, 0)).toBeNull();
    expect(isInviteExpired(incoming, 25_000, 0)).toBe(true);
    expect(isInviteExpired(incoming, 24_000, 0)).toBe(false);
  });

  it("ringkas (tidak menutupi heksa menyala) saat target sedang giliran", () => {
    const turnMe = makeMe({ playerId: "p2", pendingInvite: incoming });
    expect(getInvitePopup(turnMe, 10_000, 0)?.compact).toBe(true);
  });

  it("payload popup tidak membawa motif", () => {
    expect(Object.keys(getInvitePopup(me, 10_000, 0)!.invite)).not.toContain("motive");
  });
});

describe("reducer Ajakan", () => {
  it("invite:card menyimpan dan mengganti kartu; accepted send mengosongkan kartu", () => {
    const withCard = applyInviteCard(sessionWith(makeMe({ inviteCard: null })), { card });
    expect(withCard.me?.inviteCard).toEqual(card);
    const cleared = clearAcceptedPrivateAction(withCard, { kind: "inviteCard", cardId: "card-1" });
    expect(cleared.me?.inviteCard).toBeNull();
    expect(clearAcceptedPrivateAction(withCard, { kind: "inviteCard", cardId: "lain" })).toBe(withCard);
  });

  it("invite:incoming mengisi pendingInvite; respons diterima menutupnya", () => {
    const target = sessionWith(makeMe({ playerId: "p2" }));
    const next = applyInviteIncoming(target, incoming);
    expect(next.me?.pendingInvite).toEqual(incoming);
    expect(clearAcceptedPrivateAction(next, { kind: "invite", inviteId: incoming.inviteId }).me?.pendingInvite).toBeNull();
    // Ajakan dari diri sendiri tidak pernah jadi popup.
    expect(applyInviteIncoming(sessionWith(makeMe()), incoming).me?.pendingInvite).toBeNull();
  });

  it("invite:resolved ditambah sekali per inviteId dan menutup popup target", () => {
    const target = applyInviteIncoming(sessionWith(makeMe({ playerId: "p2" })), incoming);
    const once = applyInviteResolved(target, resolved);
    const twice = applyInviteResolved(once, resolved);
    expect(twice.me?.inviteResults).toEqual([resolved]);
    expect(twice.me?.pendingInvite).toBeNull();
  });

  it("invite:resolved untuk pemain lain diabaikan (motif tidak bocor)", () => {
    const bystander = sessionWith(makeMe({ playerId: "p3" }));
    expect(applyInviteResolved(bystander, resolved)).toBe(bystander);
    expect(buildInviteResultView(resolved, "p3", { players: [] })).toBeNull();
  });
});

describe("hasil Fase Pembalikan", () => {
  const room = { players: [
    { playerId: "p1", name: "Rina" },
    { playerId: "p2", name: "Dika" },
  ] } as Parameters<typeof buildInviteResultView>[2];

  it("target melihat jawaban, motif, dan efek untuknya", () => {
    const view = buildInviteResultView(resolved, "p2", room);
    expect(view).toMatchObject({
      title: "Ajakan dari Rina",
      answerText: "Kamu ikut",
      motiveText: "Motif: Komisi",
      effectsText: "Kekayaan -Rp1.000.000",
    });
  });

  it("pengirim melihat jawaban target; Tolak otomatis dijelaskan", () => {
    const declined = { ...resolved, answer: "decline", autoDeclined: true } as const;
    expect(buildInviteResultView(declined, "p1", room)?.answerText).toBe("Dika tidak menjawab, dihitung Tolak");
    expect(buildInviteResultView(declined, "p2", room)?.answerText).toBe("Waktu habis, dihitung Tolak");
  });

  it("efek diformat dengan istilah glosarium", () => {
    expect(formatEffects(card.planEffects)).toBe("Kekayaan -Rp500.000, Level Stress -2");
    expect(formatEffects([])).toBe("Tanpa efek");
  });
});
