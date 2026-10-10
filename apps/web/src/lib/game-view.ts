import type { Snapshot } from "@pejuang/shared";

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