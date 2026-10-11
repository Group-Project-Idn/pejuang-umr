import type { PawnId, Snapshot } from "@pejuang/shared";
import type {
  DomainEvent,
  GameState,
  PlayerIdentity,
  RandomSource,
} from "@pejuang/engine";

type PendingTurnPayload = NonNullable<Snapshot["me"]["pendingTurn"]>;
type PendingCalendarPayload = NonNullable<Snapshot["me"]["pendingCalendar"]>;

/**
 * Sesi game satu room. Menyimpan GameState lengkap (papan rahasia, status pemain);
 * state ini TIDAK PERNAH dikirim utuh ke klien, hanya lewat toPublicState dan event.
 */
export class GameSession {
  state: GameState;
  private version = 0;
  private lastTurn: { playerId: string; payload: PendingTurnPayload } | null = null;
  private lastCalendar: PendingCalendarPayload | null = null;

  constructor(
    readonly roomCode: string,
    state: GameState,
    readonly random: RandomSource,
    readonly turnSeconds: 30 | 60,
    readonly identities: Record<string, PlayerIdentity>,
  ) {
    this.state = state;
  }

  nextVersion(): number {
    this.version += 1;
    return this.version;
  }

  /** Mengingat payload popup yang sedang berjalan supaya bisa dikirim ulang di snapshot. */
  recordEvent(event: DomainEvent, payload: unknown): void {
    if (event.type === "turn:options" || event.type === "turn:dead-end") {
      if (event.target.kind === "player") {
        this.lastTurn = {
          playerId: event.target.playerId,
          payload: payload as PendingTurnPayload,
        };
      }
    } else if (event.type === "calendar:event") {
      this.lastCalendar = payload as PendingCalendarPayload;
    }
  }

  statusOf(playerId: string): Snapshot["me"]["status"] {
    return this.state.players[playerId]?.status ?? null;
  }

  /** Hanya bila pemain ini memang yang sedang ditunggu engine. */
  pendingTurnFor(playerId: string): PendingTurnPayload | null {
    const pending = this.state.pendingTurn;
    if (!pending || pending.playerId !== playerId) return null;
    if (this.lastTurn?.playerId !== playerId) return null;
    return this.lastTurn.payload.turnId === pending.turnId ? this.lastTurn.payload : null;
  }

  pendingCalendarFor(playerId: string): PendingCalendarPayload | null {
    const pending = this.state.pendingCalendarEvent;
    if (!pending || playerId in pending.answers) return null;
    const player = this.state.players[playerId];
    if (!player || player.eliminated) return null;
    return this.lastCalendar?.eventId === pending.eventId ? this.lastCalendar : null;
  }
}

export function identitiesFromRoom(
  players: ReadonlyArray<{ playerId: string; name: string; pawn: PawnId | null }>,
): Record<string, PlayerIdentity> {
  const identities: Record<string, PlayerIdentity> = {};
  for (const player of players) {
    if (player.pawn) identities[player.playerId] = { name: player.name, pawn: player.pawn };
  }
  return identities;
}
