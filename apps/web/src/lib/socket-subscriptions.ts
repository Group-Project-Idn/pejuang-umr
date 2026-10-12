export type SocketSubscriptionTarget = {
  on(event: string, listener: (...args: never[]) => void): unknown;
  off(event: string, listener: (...args: never[]) => void): unknown;
};

export type SocketSubscription = readonly [
  event: string,
  listener: (...args: never[]) => void,
];

/** Mendaftarkan satu daftar listener dan menghasilkan cleanup idempoten. */
export function subscribeSocketEvents(
  socket: unknown,
  subscriptions: readonly SocketSubscription[],
): () => void {
  const target = socket as SocketSubscriptionTarget;
  for (const [event, listener] of subscriptions) target.on(event, listener);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    for (const [event, listener] of subscriptions) target.off(event, listener);
  };
}