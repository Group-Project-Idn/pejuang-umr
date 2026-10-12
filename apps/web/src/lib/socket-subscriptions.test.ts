import { describe, expect, it, vi } from "vitest";
import { subscribeSocketEvents } from "./socket-subscriptions";

describe("socket subscriptions", () => {
  it("mendaftarkan sekali dan melepas handler yang sama secara idempoten", () => {
    const socket = { on: vi.fn(), off: vi.fn() };
    const onConnect = vi.fn();
    const onSnapshot = vi.fn();
    const cleanup = subscribeSocketEvents(socket, [
      ["connect", onConnect],
      ["session:snapshot", onSnapshot],
    ]);

    expect(socket.on.mock.calls).toEqual([
      ["connect", onConnect],
      ["session:snapshot", onSnapshot],
    ]);

    cleanup();
    cleanup();
    expect(socket.off.mock.calls).toEqual([
      ["connect", onConnect],
      ["session:snapshot", onSnapshot],
    ]);
  });
});