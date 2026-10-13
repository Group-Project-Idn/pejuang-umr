import { hexKey } from "@pejuang/shared";
import type {
  PublicGameState,
  RoomState,
  ServerToClientEvents,
  Snapshot,
} from "@pejuang/shared";

export type GamePatch = Parameters<ServerToClientEvents["game:patch"]>[0];
export type GameStarted = Parameters<ServerToClientEvents["game:started"]>[0];
export type TurnStart = Parameters<ServerToClientEvents["turn:start"]>[0];
export type TileOpened = Parameters<ServerToClientEvents["tile:opened"]>[0];
export type TileResolved = Parameters<ServerToClientEvents["tile:resolved"]>[0];
export type RoundReveal = Parameters<ServerToClientEvents["round:reveal"]>[0];
export type GoldSpawned = Parameters<ServerToClientEvents["gold:spawned"]>[0];
export type GoldExpired = Parameters<ServerToClientEvents["gold:expired"]>[0];
export type SeasonChanged = Parameters<ServerToClientEvents["season:changed"]>[0];
export type PlayerEliminated = Parameters<
  ServerToClientEvents["player:eliminated"]
>[0];
export type GameFinished = Parameters<ServerToClientEvents["game:finished"]>[0];
export type PlayerConnection = Parameters<
  ServerToClientEvents["player:connection"]
>[0];

export type PublicGameEvent =
  | { type: "game:started"; payload: GameStarted }
  | { type: "turn:start"; payload: TurnStart }
  | { type: "tile:opened"; payload: TileOpened }
  | { type: "round:reveal"; payload: RoundReveal }
  | { type: "tile:resolved"; payload: TileResolved }
  | { type: "gold:spawned"; payload: GoldSpawned }
  | { type: "gold:expired"; payload: GoldExpired }
  | { type: "season:changed"; payload: SeasonChanged }
  | { type: "player:eliminated"; payload: PlayerEliminated }
  | { type: "game:finished"; payload: GameFinished };

export type RealtimeGameView = {
  game: PublicGameState | null;
};

export function acceptSnapshot(
  current: Snapshot | null,
  incoming: Snapshot,
): Snapshot {
  const currentVersion = current?.game?.version ?? -1;
  const incomingVersion = incoming.game?.version ?? -1;
  if (
    current?.room.code === incoming.room.code &&
    current.game !== null &&
    incoming.game !== null &&
    current.game.gameId === incoming.game.gameId &&
    currentVersion > incomingVersion
  ) {
    return current;
  }
  return incoming;
}

export function applyGamePatch(
  current: PublicGameState | null,
  patch: GamePatch,
): PublicGameState | null {
  if (!current || patch.version <= current.version) return current;
  return patch.ops.reduce<PublicGameState>((next, operation) => {
    switch (operation.type) {
      case "scores":
        return { ...next, scores: operation.scores };
      case "rankOneBurden":
        return { ...next, rankOneBurden: operation.playerIds };
      case "calendar":
        return {
          ...next,
          calendar: operation.calendar,
          phase: "calendar",
          activePlayerId: null,
          turnDeadline: null,
        };
      default:
        return next;
    }
  }, { ...current, version: patch.version });
}

/** Semua event publik membawa version; event lebih lama tidak mengulang efek. */
function isStale(current: PublicGameState | null, version: number): boolean {
  return current === null || version < current.version;
}

export function applyGameStarted(
  current: PublicGameState | null,
  payload: GameStarted,
): PublicGameState | null {
  if (
    current &&
    current.gameId === payload.gameId &&
    payload.version < current.version
  ) {
    return current;
  }
  return {
    version: payload.version,
    gameId: payload.gameId,
    boardRadius: payload.boardRadius,
    calendar: payload.calendar,
    turnOrder: payload.turnOrder,
    activePlayerId: null,
    turnDeadline: null,
    pawns: payload.startPositions.map(({ playerId, hex }) => ({ playerId, hex })),
    openedHexes: [],
    gold: null,
    scores: [],
    rankOneBurden: [],
    eliminated: [],
    phase: "calendar",
  };
}

export function applyTurnStart(
  current: PublicGameState | null,
  payload: TurnStart,
): PublicGameState | null {
  if (isStale(current, payload.version)) return current;
  return {
    ...current!,
    version: payload.version,
    activePlayerId: payload.playerId,
    turnDeadline: payload.deadline,
    phase: "turn",
  };
}

export function applyTileOpened(
  current: PublicGameState | null,
  payload: TileOpened,
): PublicGameState | null {
  if (isStale(current, payload.version)) return current;
  const target = hexKey(payload.to);
  const alreadyOpened = current!.openedHexes.some(
    (opened) => hexKey(opened.hex) === target,
  );
  return {
    ...current!,
    version: payload.version,
    pawns: current!.pawns.map((pawn) =>
      pawn.playerId === payload.playerId ? { ...pawn, hex: payload.to } : pawn,
    ),
    openedHexes: alreadyOpened
      ? current!.openedHexes.map((opened) =>
          hexKey(opened.hex) === target
            ? { ...opened, byPlayerId: payload.playerId, title: payload.title }
            : opened,
        )
      : [
          ...current!.openedHexes,
          {
            hex: payload.to,
            category: payload.category,
            title: payload.title,
            plan: payload.plan,
            reality: null,
            byPlayerId: payload.playerId,
            step: current!.calendar.step,
          },
        ],
  };
}

export function applyTileResolved(
  current: PublicGameState | null,
  payload: TileResolved,
): PublicGameState | null {
  if (isStale(current, payload.version)) return current;
  const target = hexKey(payload.hex);
  return {
    ...current!,
    version: payload.version,
    openedHexes: current!.openedHexes.map((opened) =>
      hexKey(opened.hex) === target && opened.byPlayerId === payload.playerId && opened.step === payload.round
        ? { ...opened, reality: {
            outcome: payload.outcome,
            text: payload.text,
            effects: payload.effects,
            seasonal: payload.seasonal,
          } }
        : opened,
    ),
  };
}

export function applyRoundReveal(
  current: PublicGameState | null,
  payload: RoundReveal,
): PublicGameState | null {
  if (isStale(current, payload.version)) return current;
  return { ...current!, version: payload.version, phase: "reveal", activePlayerId: null, turnDeadline: null };
}

export function applyGoldSpawned(
  current: PublicGameState | null,
  payload: GoldSpawned,
): PublicGameState | null {
  if (isStale(current, payload.version)) return current;
  return { ...current!, version: payload.version, gold: payload.gold };
}

export function applyGoldExpired(
  current: PublicGameState | null,
  payload: GoldExpired,
): PublicGameState | null {
  if (isStale(current, payload.version)) return current;
  if (current!.gold?.goldId !== payload.goldId) return current;
  return {
    ...current!,
    version: payload.version,
    gold: null,
  };
}

export function applySeasonChanged(
  current: PublicGameState | null,
  payload: SeasonChanged,
): PublicGameState | null {
  if (isStale(current, payload.version)) return current;
  return {
    ...current!,
    version: payload.version,
    calendar: { ...current!.calendar, season: payload.season },
  };
}

export function applyPlayerEliminated(
  current: PublicGameState | null,
  payload: PlayerEliminated,
): PublicGameState | null {
  if (isStale(current, payload.version)) return current;
  if (current!.eliminated.includes(payload.playerId)) return current;
  const wasActive = current!.activePlayerId === payload.playerId;
  return {
    ...current!,
    version: payload.version,
    eliminated: [...current!.eliminated, payload.playerId],
    scores: current!.scores.map((score) =>
      score.playerId === payload.playerId ? { ...score, eliminated: true } : score,
    ),
    activePlayerId: wasActive ? null : current!.activePlayerId,
    turnDeadline: wasActive ? null : current!.turnDeadline,
  };
}

export function applyGameFinished(
  current: PublicGameState | null,
  payload: GameFinished,
): PublicGameState | null {
  if (isStale(current, payload.version)) return current;
  return {
    ...current!,
    version: payload.version,
    activePlayerId: null,
    turnDeadline: null,
    phase: "finished",
  };
}

/** Satu pintu reduksi event publik; event lebih lama dibiarkan tanpa efek. */
export function applyPublicGameEvent(
  current: PublicGameState | null,
  event: PublicGameEvent,
): PublicGameState | null {
  switch (event.type) {
    case "game:started":
      return applyGameStarted(current, event.payload);
    case "turn:start":
      return applyTurnStart(current, event.payload);
    case "tile:opened":
      return applyTileOpened(current, event.payload);
    case "round:reveal":
      return applyRoundReveal(current, event.payload);
    case "tile:resolved":
      return applyTileResolved(current, event.payload);
    case "gold:spawned":
      return applyGoldSpawned(current, event.payload);
    case "gold:expired":
      return applyGoldExpired(current, event.payload);
    case "season:changed":
      return applySeasonChanged(current, event.payload);
    case "player:eliminated":
      return applyPlayerEliminated(current, event.payload);
    case "game:finished":
      return applyGameFinished(current, event.payload);
  }
}

/** Status koneksi hanya menyentuh room state, bukan game state. */
export function applyPlayerConnection(
  room: RoomState,
  payload: PlayerConnection,
): RoomState {
  if (!room.players.some((player) => player.playerId === payload.playerId)) {
    return room;
  }
  return {
    ...room,
    players: room.players.map((player) =>
      player.playerId === payload.playerId
        ? { ...player, connected: payload.connected }
        : player,
    ),
  };
}

export function getServerNow(localNow: number, serverClockOffsetMs: number) {
  return localNow + serverClockOffsetMs;
}

export function getTurnSecondsLeft({
  localNow,
  serverClockOffsetMs,
  deadline,
}: {
  localNow: number;
  serverClockOffsetMs: number;
  deadline: number | null;
}) {
  if (!deadline) return 0;
  return Math.max(
    0,
    Math.ceil((deadline - getServerNow(localNow, serverClockOffsetMs)) / 1_000),
  );
}
