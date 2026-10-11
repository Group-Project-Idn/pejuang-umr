import { getHexRing, type HexCoord, type PublicGameState } from "@pejuang/shared";
import { getCalendarInfo } from "../calendar/calendar";
import { INITIAL_STATUS } from "../economy/constants";
import { toScoreRows } from "../score/ranking";
import { createBoardState, type BoardState } from "../board/board-state";
import type { BoardRadius } from "../hex/board";
import type { RandomSource } from "../random";

export function getBoardRadius(playerCount: number): BoardRadius {
  if (playerCount < 2 || playerCount > 4) {
    throw new RangeError("Game membutuhkan dua sampai empat pemain.");
  }
  return playerCount === 2 ? 4 : playerCount === 3 ? 5 : 6;
}

export function createTurnOrder(
  playerIds: readonly string[],
  random: RandomSource,
): string[] {
  const order = [...playerIds];
  for (let index = order.length - 1; index > 0; index -= 1) {
    const target = random.integer(0, index);
    [order[index], order[target]] = [order[target]!, order[index]!];
  }
  return order;
}

const START_RING_RADIUS = 2;

export function createStartPositions(
  playerIds: readonly string[],
): Array<{ playerId: string; hex: HexCoord }> {
  const ring = getHexRing({ q: 0, r: 0 }, START_RING_RADIUS);
  const spacing = ring.length / playerIds.length;
  return playerIds.map((playerId, index) => ({
    playerId,
    hex: ring[index * spacing]!,
  }));
}

export function createInitialGameState(
  playerIds: readonly string[],
  gameId: string,
  random: RandomSource,
): PublicGameState {
  return createGameSetup(playerIds, gameId, random).publicState;
}

export function createGameSetup(
  playerIds: readonly string[],
  gameId: string,
  random: RandomSource,
): { publicState: PublicGameState; board: BoardState } {
  const boardRadius = getBoardRadius(playerIds.length);
  const turnOrder = createTurnOrder(playerIds, random);
  const pawns = createStartPositions(turnOrder);
  const board = createBoardState(
    boardRadius,
    pawns.map(({ hex }) => hex),
    random,
  );
  const publicState: PublicGameState = {
    version: 1,
    gameId,
    boardRadius,
    calendar: getCalendarInfo(1),
    turnOrder,
    activePlayerId: null,
    turnDeadline: null,
    turnPaused: false,
    pawns,
    openedHexes: [],
    deadHexes: [],
    gold: null,
    scores: toScoreRows(
      turnOrder.map((playerId) => ({
        playerId,
        status: { ...INITIAL_STATUS },
        eliminated: false,
        eliminatedAtStep: null,
      })),
    ),
    rankOneBurden: [],
    eliminated: [],
    spectators: [],
  };
  return { publicState, board };
}
