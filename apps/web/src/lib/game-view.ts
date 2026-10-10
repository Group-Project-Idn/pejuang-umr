import type {
  PublicGameState,
  ServerToClientEvents,
  Snapshot,
} from "@pejuang/shared";

export type GamePatch = Parameters<ServerToClientEvents["game:patch"]>[0];
export type TurnTimer = Parameters<ServerToClientEvents["turn:timer"]>[0];

export type RealtimeGameView = {
  game: PublicGameState | null;
  timerRemainingMs: number | null;
};

export function acceptSnapshot(
  current: Snapshot | null,
  incoming: Snapshot,
): Snapshot {
  const currentVersion = current?.game?.version ?? -1;
  const incomingVersion = incoming.game?.version ?? -1;
  if (
    current?.room.code === incoming.room.code &&
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
        return { ...next, calendar: operation.calendar };
      case "inviteSincereDeclined":
        return next;
    }
  }, { ...current, version: patch.version });
}

export function applyTurnTimer(
  current: PublicGameState | null,
  timer: TurnTimer,
): PublicGameState | null {
  if (!current || timer.version < current.version) return current;
  return {
    ...current,
    version: timer.version,
    turnPaused: timer.paused,
    turnDeadline: timer.deadline,
  };
}

export function applyRealtimeTurnTimer(
  current: RealtimeGameView,
  timer: TurnTimer,
): RealtimeGameView {
  const game = applyTurnTimer(current.game, timer);
  if (game === current.game && timer.version < (current.game?.version ?? -1)) {
    return current;
  }
  return {
    game,
    timerRemainingMs: timer.paused ? timer.remainingMs : null,
  };
}

export function getServerNow(localNow: number, serverClockOffsetMs: number) {
  return localNow + serverClockOffsetMs;
}

export function getTurnSecondsLeft({
  localNow,
  serverClockOffsetMs,
  deadline,
  paused,
  remainingMs,
}: {
  localNow: number;
  serverClockOffsetMs: number;
  deadline: number | null;
  paused: boolean;
  remainingMs: number | null;
}) {
  if (paused && remainingMs !== null) {
    return Math.max(0, Math.ceil(remainingMs / 1_000));
  }
  if (!deadline) return 0;
  return Math.max(
    0,
    Math.ceil((deadline - getServerNow(localNow, serverClockOffsetMs)) / 1_000),
  );
}
