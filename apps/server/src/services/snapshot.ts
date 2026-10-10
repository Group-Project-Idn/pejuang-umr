import type { PublicGameState, RoomState, Snapshot } from "@pejuang/shared";

export function createSnapshot(
  room: RoomState,
  playerId: string,
  game: PublicGameState | null,
  serverTime = Date.now(),
): Snapshot {
  return {
    serverTime,
    room,
    game,
    me: {
      playerId,
      status: null,
      inviteCard: null,
      pendingTurn: null,
      pendingCalendar: null,
      pendingInvite: null,
      isSpectator: false,
    },
    result: null,
  };
}
