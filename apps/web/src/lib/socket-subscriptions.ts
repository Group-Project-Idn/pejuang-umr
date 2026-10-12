import type { ServerToClientEvents } from "@pejuang/shared";
import type { SocketReservedEvents } from "socket.io-client";
import type { GameSocket } from "./socket";

type SubscriptionEvents = ServerToClientEvents & SocketReservedEvents;

export type SocketSubscription = {
  [Event in keyof SubscriptionEvents]: readonly [
    event: Event,
    listener: SubscriptionEvents[Event],
  ];
}[keyof SubscriptionEvents];

/** Mendaftarkan satu daftar listener dan menghasilkan cleanup idempoten. */
export function subscribeSocketEvents(
  socket: Pick<GameSocket, "on" | "off">,
  subscriptions: readonly SocketSubscription[],
): () => void {
  const target = socket as {
    on(event: string, listener: (...args: never[]) => void): unknown;
    off(event: string, listener: (...args: never[]) => void): unknown;
  };
  for (const [event, listener] of subscriptions) target.on(event, listener);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    for (const [event, listener] of subscriptions) target.off(event, listener);
  };
}