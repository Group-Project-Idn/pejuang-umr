import type { PublicPlayer } from "./player";

export type RoomStatus = "waiting" | "countdown" | "playing" | "finished";
export type StartBlockReason = "NEED_MIN_PLAYERS" | "WAITING_READY";

export type RoomPlayer = PublicPlayer & {
  isHost: boolean;
  ready: boolean;
  joinedAt: number;
};

export type RoomState = {
  code: string;
  status: RoomStatus;
  hostId: string;
  turnSeconds: 30 | 60;
  players: RoomPlayer[];
  maxPlayers: 4;
  canStart: boolean;
  startBlockReason: StartBlockReason | null;
};