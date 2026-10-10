export const ERROR_CODES = [
  "INVALID_PAYLOAD",
  "UNAUTHORIZED",
  "NAME_REJECTED",
  "RATE_LIMITED",
  "ROOM_NOT_FOUND",
  "ROOM_FULL",
  "ROOM_LOCKED",
  "ALREADY_IN_ROOM",
  "NOT_IN_ROOM",
  "NOT_HOST",
  "PAWN_TAKEN",
  "NOT_ENOUGH_PLAYERS",
  "PLAYERS_NOT_READY",
  "NOT_YOUR_TURN",
  "TILE_NOT_LIT",
  "INVALID_TILE",
  "STALE_VERSION",
  "EVENT_CLOSED",
  "NO_INVITE_CARD",
  "INVITE_LIMIT",
  "INVALID_TARGET",
  "INVITE_EXPIRED",
  "NOT_ELIMINATED",
  "GAME_FINISHED",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type ServerErrorPayload = {
  code: ErrorCode;
  message: string;
  fatal: boolean;
};