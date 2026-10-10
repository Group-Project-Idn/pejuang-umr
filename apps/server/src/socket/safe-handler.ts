import type { Ack, AckCallback } from "@pejuang/shared";

export function executeWithAck<T extends object>(
  unsafeAck: unknown,
  action: (ack: AckCallback<T>) => void,
): void {
  const ack: AckCallback<T> =
    typeof unsafeAck === "function"
      ? (unsafeAck as AckCallback<T>)
      : () => undefined;

  try {
    action(ack);
  } catch {
    ack({ ok: false, error: "INTERNAL" } as Ack<T>);
  }
}