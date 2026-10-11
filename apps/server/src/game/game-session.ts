import type { PawnId, Snapshot } from "@pejuang/shared";
import {
  TOTAL_STEPS,
  answerCalendarEvent,
  chooseHex,
  closeCalendarEvent,
  endRound,
  finishGame,
  startRound,
  startTurn,
  timeoutTurn,
  type CalendarChoiceId,
  type DomainEvent,
  type GameState,
  type PlayerIdentity,
  type RandomSource,
  type RoundResult,
  type TurnResult,
} from "@pejuang/engine";
import type { Ack, HexCoord } from "@pejuang/shared";
import { systemClock, type Clock, type TimerHandle } from "./clock";

export const CALENDAR_SECONDS = 15;

export interface SessionRuntime {
  clock: Clock;
  /** Meneruskan event engine ke klien (dispatcher). */
  send(events: DomainEvent[]): void;
  /** Dipanggil sekali saat game selesai (mis. status room "finished"). */
  onFinished(): void;
}

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
    private readonly runtime: SessionRuntime = {
      clock: systemClock,
      send: () => undefined,
      onFinished: () => undefined,
    },
  ) {
    this.state = state;
  }

  private calendarTimer: TimerHandle | null = null;
  private turnTimer: TimerHandle | null = null;
  finished = false;

  /** Memulai ronde pertama. */
  start(): void {
    this.runRound();
  }

  /** Membersihkan semua timer. */
  dispose(): void {
    this.clearCalendarTimer();
    this.clearTurnTimer();
  }

  answerCalendar(
    playerId: string,
    eventId: string,
    choice: CalendarChoiceId,
  ): Ack {
    if (this.finished) return { ok: false, error: "GAME_FINISHED" };
    const result = answerCalendarEvent(this.state, playerId, eventId, choice);
    if (!result.ok) return { ok: false, error: result.code, message: result.message };
    this.state = result.state;
    const answers = this.state.pendingCalendarEvent?.answers ?? {};
    const everyoneAnswered = Object.entries(this.state.players).every(
      ([id, player]) => player.eliminated || id in answers,
    );
    if (everyoneAnswered) this.closeCalendar();
    return { ok: true };
  }

  /** turn:choose (mode "normal") dan turn:jump (mode "deadEnd"). */
  move(playerId: string, turnId: string, hex: HexCoord, kind: "choose" | "jump"): Ack {
    if (this.finished) return { ok: false, error: "GAME_FINISHED" };
    const pending = this.state.pendingTurn;
    if (pending && pending.playerId === playerId && pending.turnId === turnId) {
      const expected = kind === "choose" ? "normal" : "deadEnd";
      if (pending.mode !== expected) return { ok: false, error: "INVALID_PAYLOAD" };
    }
    const result = chooseHex(this.state, playerId, turnId, hex, this.random);
    if (!result.ok) return { ok: false, error: result.code, message: result.message };
    this.clearTurnTimer();
    this.applyTurnResult(result);
    return { ok: true };
  }

  private runRound(): void {
    const result = startRound(this.state, this.random);
    this.applyRoundResult(result);
    if (result.nextAction === "finished") return this.finish();
    if (this.state.phase === "calendarEvent") {
      this.calendarTimer = this.runtime.clock.setTimeout(
        () => this.closeCalendar(),
        CALENDAR_SECONDS * 1000,
      );
      return;
    }
    this.runTurn();
  }

  private closeCalendar(): void {
    if (this.finished || this.state.phase !== "calendarEvent") return;
    this.clearCalendarTimer();
    const result = closeCalendarEvent(this.state, this.random);
    this.applyRoundResult(result);
    if (result.nextAction === "finished") return this.finish();
    this.runTurn();
  }

  private runTurn(): void {
    const result = startTurn(this.state, this.random);
    this.applyRoundResult(result);
    const pending = this.state.pendingTurn;
    if (!pending) return this.nextRound();
    this.turnTimer = this.runtime.clock.setTimeout(
      () => this.onTurnTimeout(pending.turnId),
      this.turnSeconds * 1000,
    );
  }

  private onTurnTimeout(turnId: string): void {
    this.turnTimer = null;
    if (this.finished) return;
    const result = timeoutTurn(this.state, turnId, this.random);
    if (result.ok) this.applyTurnResult(result);
  }

  private applyTurnResult(result: Extract<TurnResult, { ok: true }>): void {
    this.state = result.state;
    this.emit(result.events);
    if (result.nextAction === "nextTurn") this.runTurn();
    else if (result.nextAction === "endRound") this.nextRound();
    else this.finish();
  }

  private nextRound(): void {
    if (this.state.public.calendar.step >= TOTAL_STEPS) return this.finish();
    const result = endRound(this.state, this.random);
    this.state = result.state;
    this.emit(result.events);
    this.runRound();
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.dispose();
    const result = finishGame(this.state, this.identities);
    this.state = result.state;
    this.runtime.send(result.events);
    this.runtime.onFinished();
  }

  private applyRoundResult(result: RoundResult): void {
    this.state = result.state;
    this.emit(result.events);
  }

  /** Mengisi deadline lalu mengirim. game:finished dikirim hanya oleh finish() (memakai identitas). */
  private emit(events: DomainEvent[]): void {
    const now = this.runtime.clock.now();
    const filled = events
      .filter((event) => event.type !== "game:finished")
      .map((event): DomainEvent => {
        if (event.type === "calendar:event") {
          return {
            ...event,
            payload: { ...event.payload, deadline: now + CALENDAR_SECONDS * 1000 },
          };
        }
        if (event.type === "turn:start") {
          return {
            ...event,
            payload: {
              ...event.payload,
              deadline: now + this.turnSeconds * 1000,
              turnSeconds: this.turnSeconds,
            },
          };
        }
        return event;
      });
    if (filled.length > 0) this.runtime.send(filled);
  }

  private clearCalendarTimer(): void {
    if (this.calendarTimer !== null) this.runtime.clock.clearTimeout(this.calendarTimer);
    this.calendarTimer = null;
  }

  private clearTurnTimer(): void {
    if (this.turnTimer !== null) this.runtime.clock.clearTimeout(this.turnTimer);
    this.turnTimer = null;
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
