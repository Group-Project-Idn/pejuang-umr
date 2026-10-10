import type { ErrorCode } from "./errors";

export type Ack<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: ErrorCode; message?: string };

export type AckCallback<T extends object = object> = (
  response: Ack<T>,
) => void;
