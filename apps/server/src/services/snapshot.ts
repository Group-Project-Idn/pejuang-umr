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
      inviteCard: session ? session.inviteCardFor(playerId) : null,
      pendingTurn: session ? session.pendingTurnFor(playerId) : null,
      pendingCalendar: session ? session.pendingCalendarFor(playerId) : null,
      pendingInvite: session ? session.pendingInviteFor(playerId) : null,
      pendingMonth: session ? session.pendingMonthFor(playerId) : null,
      reflection: session ? session.reflectionFor(playerId) : null,
      isSpectator: false, // @deprecated v1.12: mode penonton dihapus
    },
    result: session ? session.result : null,
  };
}
