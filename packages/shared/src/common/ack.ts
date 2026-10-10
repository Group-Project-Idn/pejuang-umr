import type { ErrorCode } from "./errors";

export type Ack<T extends object = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: ErrorCode; message?: string };

export type AckCallback<T extends object = Record<string, never>> = (
  response: Ack<T>,
) => void;