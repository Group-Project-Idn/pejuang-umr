import { describe, expect, it, vi } from "vitest";
import type { GameSocket } from "./socket";
import {
  type SocketSubscription,
  subscribeSocketEvents,
} from "./socket-subscriptions";

describe("socket subscriptions", () => {
  it("mendaftarkan sekali dan melepas handler yang sama secara idempoten", () => {
    const socket = { on: vi.fn(), off: vi.fn() };
    const onConnect = vi.fn();
    const onSnapshot = vi.fn();
    const cleanup = subscribeSocketEvents(
      socket as unknown as Pick<GameSocket, "on" | "off">,
      [
        ["connect", onConnect],
        ["session:snapshot", onSnapshot],
      ],
    );

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

  it("menjaga pasangan nama event dan tipe payload saat compile", () => {
    const valid: SocketSubscription = ["room:state", vi.fn()];
    expect(valid[0]).toBe("room:state");

    // @ts-expect-error nama event harus terdaftar pada kontrak socket
    const invalidEvent: SocketSubscription = ["room:typo", vi.fn()];
    // @ts-expect-error payload handler harus sesuai dengan nama event
    const invalidPayload: SocketSubscription = [
      "room:state",
      (payload: string) => void payload,
    ];
    void invalidEvent;
    void invalidPayload;
  });
});