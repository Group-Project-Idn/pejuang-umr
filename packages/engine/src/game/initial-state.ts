import type { HexCoord, PublicGameState } from "@pejuang/shared";
import { createBoard, type BoardRadius } from "../hex/board";
import { getHexDistance } from "../hex/coordinates";
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

export function createStartPositions(
  playerIds: readonly string[],
  radius: BoardRadius,
): Array<{ playerId: string; hex: HexCoord }> {
  const edge = createBoard(radius).filter(
    (hex) => getHexDistance({ q: 0, r: 0 }, hex) === radius,
  );
  const spacing = Math.floor(edge.length / playerIds.length);
  return playerIds.map((playerId, index) => ({
    playerId,
    hex: edge[index * spacing]!,
  }));
}

export function createInitialGameState(
  playerIds: readonly string[],
  gameId: string,
  random: RandomSource,
): PublicGameState {
  const boardRadius = getBoardRadius(playerIds.length);
  const turnOrder = createTurnOrder(playerIds, random);
  return {
    version: 1,
    gameId,
    boardRadius,
    calendar: {
      step: 1,
      totalSteps: 24,
      round: 1,
      month: 1,
      dateLabel: "Januari · Pekan 1",
      season: "rainy",
      nextEvent: null,
    },
    turnOrder,
    activePlayerId: null,
    turnDeadline: null,
    turnPaused: false,
    pawns: createStartPositions(turnOrder, boardRadius),
    openedHexes: [],
    deadHexes: [],
    gold: null,
    scores: turnOrder.map((playerId, index) => ({
      playerId,
      provisionalScore: 0,
      rank: index + 1,
      eliminated: false,
    })),
    rankOneBurden: [],
    eliminated: [],
    spectators: [],
  };
}
