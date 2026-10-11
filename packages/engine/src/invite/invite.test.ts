import { describe, expect, it } from "vitest";
import { createGame } from "../game/create-game";
import { getCalendarInfo } from "../calendar/calendar";
import { SequenceRandomSource } from "../random";
import { distributeInviteCards, resolveInvite, sendInvite } from "./invite";

function game() {
  return createGame(
    ["a", "b"],
    "g",
    new SequenceRandomSource([0.1, 0.8, 0.3]),
  ).state;
}

describe("Ajakan", () => {
  it("membagikan satu kartu privat pada awal bulan ganjil dan menghanguskan kartu lama", () => {
    const first = distributeInviteCards(game(), new SequenceRandomSource([0, 0, 0, 0]));
    expect(first.state.inviteCards.a?.motive).toBe("sincere");
    expect(first.events.filter((event) => event.type === "invite:card")).toHaveLength(2);
    const oldCard = first.state.inviteCards.a!;
    const nextState = {
      ...first.state,
      public: { ...first.state.public, calendar: getCalendarInfo(5) },
    };
    const next = distributeInviteCards(nextState, new SequenceRandomSource([0.9, 0.9]));
    const cardEvent = next.events.find(
      (event) => event.type === "invite:card" && event.target.kind === "player" && event.target.playerId === "a",
    );
    expect(cardEvent?.type === "invite:card" && cardEvent.payload.expiredCardId).toBe(oldCard.cardId);
  });

  it("membatasi satu Ajakan per ronde tanpa memakai kartu pengirim kedua", () => {
    const dealt = distributeInviteCards(game(), new SequenceRandomSource([0, 0, 0, 0])).state;
    const sent = sendInvite(dealt, "a", "A", dealt.inviteCards.a!.cardId, "b");
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    expect(sent.state.inviteCards.a).toBeNull();
    const rejected = sendInvite(
      sent.state,
      "b",
      "B",
      sent.state.inviteCards.b!.cardId,
      "a",
    );
    expect(rejected.ok ? "ok" : rejected.code).toBe("INVITE_LIMIT");
    expect(sent.state.inviteCards.b).not.toBeNull();
  });

  it("motif Tulus ikut menerapkan Rencana dan mengurangi stres kedua pemain", () => {
    const dealt = distributeInviteCards(game(), new SequenceRandomSource([0, 0, 0, 0])).state;
    const sent = sendInvite(dealt, "a", "A", dealt.inviteCards.a!.cardId, "b");
    if (!sent.ok) throw new Error(sent.message);
    const resolved = resolveInvite(sent.state, "b", sent.state.pendingInvite!.inviteId, "join");
    if (!resolved.ok) throw new Error(resolved.message);
    expect(resolved.state.pendingInvite).toBeNull();
    expect(resolved.state.players.b!.status.wealth).toBe(6_500_000);
    expect(resolved.state.players.a!.status.stress).toBe(0);
  });

  it("penolakan motif Tulus memberi penalti dan patch publik", () => {
    const dealt = distributeInviteCards(game(), new SequenceRandomSource([0, 0, 0, 0])).state;
    const sent = sendInvite(dealt, "a", "A", dealt.inviteCards.a!.cardId, "b");
    if (!sent.ok) throw new Error(sent.message);
    const resolved = resolveInvite(sent.state, "b", sent.state.pendingInvite!.inviteId, "decline");
    if (!resolved.ok) throw new Error(resolved.message);
    expect(resolved.state.players.b!.status.wealth).toBe(4_500_000);
    expect(resolved.events.some((event) => event.type === "game:patch")).toBe(true);
  });

  it("timeout dianggap decline dan invite lama ditolak", () => {
    const dealt = distributeInviteCards(game(), new SequenceRandomSource([0, 0, 0, 0])).state;
    const sent = sendInvite(dealt, "a", "A", dealt.inviteCards.a!.cardId, "b");
    if (!sent.ok) throw new Error(sent.message);
    const inviteId = sent.state.pendingInvite!.inviteId;
    const resolved = resolveInvite(sent.state, "b", inviteId, "decline", true);
    if (!resolved.ok) throw new Error(resolved.message);
    const payload = resolved.events.find((event) => event.type === "invite:resolved")?.payload;
    expect(payload && "autoDeclined" in payload && payload.autoDeclined).toBe(true);
    const stale = resolveInvite(resolved.state, "b", inviteId, "join");
    expect(stale.ok ? "ok" : stale.code).toBe("INVITE_EXPIRED");
  });
});