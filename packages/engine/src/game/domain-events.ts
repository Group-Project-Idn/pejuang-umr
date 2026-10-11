import type { ServerToClientEvents } from "@pejuang/shared";

export type EventTarget = { kind: "room" } | { kind: "player"; playerId: string };

export type DomainEventType =
  | "game:patch"
  | "season:changed"
  | "month:summary"
  | "doom:triggered"
  | "player:eliminated"
  | "player:status"
  | "calendar:event"
  | "calendar:result"
  | "turn:start"
  | "turn:options"
  | "turn:dead-end"
  | "tile:opened"
  | "tile:resolved"
  | "gold:spawned"
  | "gold:expired"
  | "invite:card"
  | "game:finished";

type PayloadOf<K extends DomainEventType> = Parameters<ServerToClientEvents[K]>[0];

type DomainEventMap = {
  [K in DomainEventType]: { type: K; target: EventTarget; payload: PayloadOf<K> };
};

/**
 * Event yang dihasilkan engine. Field `version` di payload diisi 0;
 * server yang memberi nomor version sebenarnya.
 */
export type DomainEvent = DomainEventMap[DomainEventType];
