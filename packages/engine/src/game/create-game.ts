import { getCalendarInfo } from "../calendar/calendar";
import { INITIAL_STATUS } from "../economy/constants";
import type { RandomSource } from "../random";
import type { DomainEvent } from "./domain-events";
import type { GameState, PlayerState } from "./game-state";
import { createGameSetup } from "./initial-state";

export function createGame(
  playerIds: readonly string[],
  gameId: string,
  random: RandomSource,
): { state: GameState; events: DomainEvent[] } {
  const { publicState, board } = createGameSetup(playerIds, gameId, random);
  const players: Record<string, PlayerState> = {};
  for (const playerId of playerIds) {
    players[playerId] = {
      status: { ...INITIAL_STATUS },
      eliminated: false,
      eliminatedAtStep: null,
      eliminatedReason: null,
      inviteCard: null,
    };
  }
  const state: GameState = {
    public: { ...publicState, calendar: getCalendarInfo(1), phase: "calendar" },
    board,
    players,
    baseTurnOrder: [...publicState.turnOrder],
    pendingTurn: null,
    pendingCalendarEvent: null,
    pendingMonth: null,
    movedThisRound: [],
    phase: "roundStart",
    inviteUsedThisRound: false,
    pendingInvite: null,
    pendingRealities: [],
  };
  const events: DomainEvent[] = playerIds.map((playerId) => ({
    type: "player:status",
    target: { kind: "player", playerId },
    payload: { ...INITIAL_STATUS },
  }));
  return { state, events };
}
