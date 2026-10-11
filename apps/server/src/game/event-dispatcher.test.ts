import { createGame, SequenceRandomSource, type DomainEvent } from "@pejuang/engine";
import { describe, expect, it, vi } from "vitest";
import { dispatch } from "./event-dispatcher";
import { GameSession } from "./game-session";

type Sent = { to: string | null; playerId: string | null; type: string; payload: unknown };

function setup(connected: string[]) {
  const sent: Sent[] = [];
  const io = {
    to: (room: string) => ({
      emit: (type: string, payload: unknown) => sent.push({ to: room, playerId: null, type, payload }),
    }),
    sockets: {
      sockets: new Map(
        connected.map((playerId) => [
          playerId,
          {
            data: { playerId },
            emit: (type: string, payload: unknown) =>
              sent.push({ to: null, playerId, type, payload }),
          },
        ]),
      ),
    },
  };
  const random = new SequenceRandomSource([0.1, 0.5, 0.9]);
  const { state, events } = createGame(["a", "b"], "g1", random);
  const session = new GameSession("UMR-1234", state, random, 30, {});
  return { io: io as never, sent, session, events };
}

describe("dispatch", () => {
  it("mengirim player:status hanya ke pemilik", () => {
    const { io, sent, session, events } = setup(["a", "b"]);
    dispatch(io, session, events);
    expect(sent.map((item) => item.playerId).sort()).toEqual(["a", "b"]);
    expect(sent.every((item) => item.to === null && item.type === "player:status")).toBe(true);
  });

  it("mengabaikan pemain yang sedang putus", () => {
    const { io, sent, session, events } = setup(["a"]);
    dispatch(io, session, events);
    expect(sent.map((item) => item.playerId)).toEqual(["a"]);
  });

  it("memberi version berurutan untuk event room dan meneruskan event baru secara umum", () => {
    const { io, sent, session } = setup(["a", "b"]);
    const gold = {
      goldId: "g",
      hex: { q: 0, r: 0 },
      title: "Emas",
      plan: [],
      expiresAtStep: 5,
    };
    dispatch(io, session, [
      { type: "gold:spawned", target: { kind: "room" }, payload: { version: 0, gold } },
      { type: "gold:spawned", target: { kind: "room" }, payload: { version: 0, gold } },
    ] as unknown as DomainEvent[]);
    expect(sent.map((item) => [item.to, item.type])).toEqual([
      ["UMR-1234", "gold:spawned"],
      ["UMR-1234", "gold:spawned"],
    ]);
    expect(sent.map((item) => (item.payload as { version: number }).version)).toEqual([1, 2]);
  });

  it("tidak mengirim payload yang gagal validasi dan tidak mencatat isinya", () => {
    const { io, sent, session } = setup(["a", "b"]);
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    dispatch(io, session, [
      { type: "player:status", target: { kind: "player", playerId: "a" }, payload: { cash: "RAHASIA" } },
    ] as unknown as DomainEvent[]);
    expect(sent).toHaveLength(0);
    expect(JSON.stringify(spy.mock.calls)).not.toContain("RAHASIA");
    spy.mockRestore();
  });
});
