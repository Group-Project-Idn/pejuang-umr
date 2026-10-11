import type { RoomState, Snapshot } from "@pejuang/shared";
import type { GameSession } from "../game/game-session";

export function createSnapshot(
  room: RoomState,
  playerId: string,
  session: GameSession | null,
  serverTime = Date.now(),
): Snapshot {
  return {
    serverTime,
    room,
    game: session ? session.publicState() : null,
    me: {
      playerId,
      status: session ? session.statusOf(playerId) : null,
      inviteCard: null,
      pendingTurn: session ? session.pendingTurnFor(playerId) : null,
      pendingCalendar: session ? session.pendingCalendarFor(playerId) : null,
      pendingInvite: null,
      isSpectator: session ? session.isSpectator(playerId) : false,
    },
    result: session ? session.result : null,
  };
}
