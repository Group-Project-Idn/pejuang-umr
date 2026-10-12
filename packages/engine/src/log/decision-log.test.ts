import { describe, expect, it } from "vitest";
import { INVITE_PLANS } from "../data";
import { createGame } from "../game/create-game";
import { sendInvite, respondInvite } from "../invite/invite";
import { SequenceRandomSource } from "../random";
import { chooseHex, endRound, startTurn } from "../turn/turn";
import {
  appendDecision,
  attachReality,
  emptyDecisionLog,
  type DecisionEntry,
} from "./decision-log";

const tile = (step: number): DecisionEntry => ({
  kind: "tile",
  step,
  tileId: "hanging-out",
  category: "social",
  title: "Nongkrong",
  plan: [],
  autoPicked: false,
  viaJump: false,
  reality: null,
});

describe("fungsi log keputusan", () => {
  it("appendDecision tidak memutasi log lama", () => {
    const empty = emptyDecisionLog(["a", "b"]);
    const next = appendDecision(empty, "a", tile(1));
    expect(empty.a).toEqual([]);
    expect(next.a).toHaveLength(1);
    expect(next.b).toEqual([]);
  });

  it("attachReality mengisi petak terakhir di langkah itu saja", () => {
    let log = appendDecision(emptyDecisionLog(["a"]), "a", tile(1));
    log = appendDecision(log, "a", tile(2));
    const reality = { outcome: "zonk" as const, text: "x", effects: [], seasonal: false };
    const updated = attachReality(log, "a", 1, reality);
    expect(updated.a![0]).toMatchObject({ step: 1, reality });
    expect(updated.a![1]).toMatchObject({ step: 2, reality: null });
    expect(attachReality(log, "a", 9, reality)).toBe(log);
  });
});

describe("pencatatan di alur game", () => {
  it("Ajakan: inviteSent di pengirim; inviteResult (dengan motif) untuk pengirim dan target setelah Fase Pembalikan", () => {
    const created = createGame(["a", "b", "c"], "g", new SequenceRandomSource([0.5])).state;
    const started = startTurn(created, new SequenceRandomSource([0.5])).state;
    const [x, y] = started.public.turnOrder as [string, string, string];
    const plan = INVITE_PLANS[0]!;
    const withCard = {
      ...started,
      players: {
        ...started.players,
        [x]: {
          ...started.players[x]!,
          inviteCard: {
            cardId: "c",
            plan: plan.id,
            planEffects: plan.effects,
            motive: "commission" as const,
            expiresAtMonth: 3,
          },
        },
      },
    };
    const sent = sendInvite(withCard, x, "c", y);
    if (!sent.ok) throw new Error(sent.message);
    expect(sent.state.decisionLog[x]!.at(-1)).toMatchObject({ kind: "inviteSent", targetId: y });
    // Motif belum tercatat di sisi target sebelum Fase Pembalikan.
    expect(JSON.stringify(sent.state.decisionLog[y])).not.toContain("commission");

    const answered = respondInvite(sent.state, y, sent.state.roundInvites[0]!.inviteId, "join");
    if (!answered.ok) throw new Error(answered.message);
    const pending = answered.state.pendingTurn!;
    const moved = chooseHex(answered.state, x, pending.turnId, pending.options[0]!, new SequenceRandomSource([0.5]));
    if (!moved.ok) throw new Error(moved.message);
    const ended = endRound(moved.state, new SequenceRandomSource([0.5]));
    for (const [id, role] of [[x, "sender"], [y, "target"]] as const) {
      expect(ended.state.decisionLog[id]!.find((e) => e.kind === "inviteResult")).toMatchObject({
        role,
        answer: "join",
        motive: "commission",
      });
    }
    expect(ended.state.decisionLog[x]!.find((e) => e.kind === "tile")).toMatchObject({
      reality: expect.objectContaining({ text: expect.any(String) }),
    });
    expect(ended.state.decisionLog[x]!.at(-1)).toMatchObject({ kind: "roundEnd", step: 1 });
    // Log tidak bocor ke event maupun state publik.
    expect(JSON.stringify(ended.events)).not.toContain("decisionLog");
    expect(JSON.stringify(ended.state.public)).not.toContain("decisionLog");
  });
});
