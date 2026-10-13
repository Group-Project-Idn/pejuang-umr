import {
  CalendarEventPayloadSchema,
  DeadEndPayloadSchema,
  InviteIncomingPayloadSchema,
  MonthSummaryPayloadSchema,
  ReflectionSchema,
  TurnOptionsPayloadSchema,
  type CharacterId,
  type Reflection,
  type Snapshot,
  type TurnSeconds,
} from "@pejuang/shared";
import {
  allMonthPaymentsAnswered,
  answerCalendarEvent,
  answerMonthPayment,
  chooseHex,
  closeCalendarEvent,
  closeMonthChange,
  endRound,
  hasMonthDebtors,
  expireInvite,
  finishGame,
  hasOpenInvites,
  respondInvite,
  sendInvite,
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
  buildPlayerReflection,
  toPublicState,
} from "@pejuang/engine";
import type {
  Ack,
  HexCoord,
  InviteIncomingPayload,
  MonthSummaryPayload,
  PublicGameState,
} from "@pejuang/shared";
import {
  DEFAULT_MONTH_PAY_SECONDS,
  DEFAULT_MONTH_SUMMARY_ONLY_MS,
  DEFAULT_REVEAL_STEP_MS,
} from "../config";
import { buildReflectionInput, type ReflectionService } from "../services/reflection";
import { systemClock, type Clock, type TimerHandle } from "./clock";
import type { ServerEvent } from "./event-dispatcher";

export const CALENDAR_SECONDS = 15;
export const INVITE_SECONDS = 15;
/** Toleransi transport; deadline yang dikirim ke klien tetap tidak berubah. */
export const DEADLINE_GRACE_MS = 500;

/** Pengaturan waktu fase Ganti Bulan dan Fase Pembalikan (dari config server). */
export interface SessionTiming {
  /** Jeda animasi per pemain di Fase Pembalikan (ms). */
  revealStepMs: number;
  /** Lama popup Ganti Bulan menunggu slider Bayar Hutang (detik). */
  monthPaySeconds: number;
  /** Lama popup Ganti Bulan bila tidak ada debtor (ms). */
  monthSummaryOnlyMs: number;
}

const DEFAULT_TIMING: SessionTiming = {
  revealStepMs: DEFAULT_REVEAL_STEP_MS,
  monthPaySeconds: DEFAULT_MONTH_PAY_SECONDS,
  monthSummaryOnlyMs: DEFAULT_MONTH_SUMMARY_ONLY_MS,
};

export interface SessionRuntime {
  clock: Clock;
  /** Nilai yang tidak diisi memakai default. */
  timing?: Partial<SessionTiming>;
  /** Meneruskan event ke klien (dispatcher). */
  send(events: ServerEvent[]): void;
  /** Layanan Refleksi (GDD 6.5); tanpa ini hanya insight berbasis aturan. */
  reflection?: ReflectionService;
  /** Dipanggil sekali saat game selesai (mis. status room "finished"). */
  onFinished(): void;
}

type PendingTurnPayload = NonNullable<Snapshot["me"]["pendingTurn"]>;
type PendingCalendarPayload = NonNullable<Snapshot["me"]["pendingCalendar"]>;
type PendingMonthPayload = NonNullable<Snapshot["me"]["pendingMonth"]>;
type FinishedPayload = NonNullable<Snapshot["result"]>;

/**
 * Sesi game satu room. Menyimpan GameState lengkap (papan rahasia, status pemain);
 * state ini TIDAK PERNAH dikirim utuh ke klien, hanya lewat toPublicState dan event.
 */
export class GameSession {
  state: GameState;
  private version = 0;
  private lastTurn: { playerId: string; payload: PendingTurnPayload } | null = null;
  private lastCalendar: PendingCalendarPayload | null = null;
  /** month:summary terakhir per pemain (dengan deadline asli), untuk snapshot. */
  private readonly lastMonth = new Map<string, PendingMonthPayload>();
  private readonly timing: SessionTiming;

  constructor(
    readonly roomCode: string,
    state: GameState,
    readonly random: RandomSource,
    readonly turnSeconds: TurnSeconds,
    readonly identities: Record<string, PlayerIdentity>,
    private readonly runtime: SessionRuntime = {
      clock: systemClock,
      send: () => undefined,
      onFinished: () => undefined,
    },
  ) {
    this.state = state;
    const given = Object.fromEntries(
      Object.entries(runtime.timing ?? {}).filter(([, value]) => value !== undefined),
    );
    this.timing = { ...DEFAULT_TIMING, ...given };
  }

  private calendarTimer: TimerHandle | null = null;
  private calendarDeadline: number | null = null;
  private turnTimer: TimerHandle | null = null;
  private monthTimer: TimerHandle | null = null;
  private monthDeadline: number | null = null;
  private revealTimer: TimerHandle | null = null;
  finished = false;
  /** Payload game:finished persis seperti yang dikirim (dengan version), untuk snapshot. */
  result: FinishedPayload | null = null;
  private turnDeadline: number | null = null;
  /** Timer 15 detik per Ajakan terbuka. */
  private readonly inviteTimers = new Map<string, TimerHandle>();
  /** Payload invite:incoming yang menunggu jawaban, per inviteId (untuk snapshot). */
  private readonly openInvites = new Map<
    string,
    { targetId: string; payload: InviteIncomingPayload }
  >();
  /** Semua pemain sudah melangkah tetapi Fase Pembalikan menunggu Ajakan terbuka (D6). */
  private awaitingInvites = false;
  /** Batas waktu (epoch ms) tiap Ajakan terbuka, untuk menolak jawaban yang terlambat. */
  private readonly inviteDeadlines = new Map<string, number>();

  /** Memulai ronde pertama. */
  start(): void {
    this.runRound();
  }

  /** Refleksi siap per pemain, maksimal satu per game (GDD 6.5). */
  private readonly reflections = new Map<string, Reflection>();
  private readonly reflectionRequested = new Set<string>();
  /** True setelah sesi ditutup (room/game dihapus): hasil refleksi yang terlambat dibuang. */
  private closed = false;

  /** Membersihkan semua timer dan menutup sesi. */
  dispose(): void {
    this.closed = true;
    this.clearTimers();
  }

  private clearTimers(): void {
    this.clearCalendarTimer();
    this.clearMonthTimer();
    this.clearRevealTimer();
    this.clearTurnTimer();
    this.clearInviteTimers();
  }

  /** month:pay-debt: jawaban slider Bayar Hutang. Popup ditutup cepat bila semua debtor sudah menjawab. */
  payMonthDebt(
    playerId: string,
    month: number,
    amount: number,
  ): Ack<{ paid: number; debtCleared: boolean; stressDelta: 0 | -2 }> {
    if (this.finished) return { ok: false, error: "GAME_FINISHED" };
    if (this.state.phase === "monthChange" && this.isPastDeadline(this.monthDeadline)) {
      this.closeMonth();
      return { ok: false, error: "PAYMENT_CLOSED" };
    }
    const result = answerMonthPayment(this.state, playerId, month, amount);
    if (!result.ok) return { ok: false, error: result.code, message: result.message };
    this.state = result.state;
    this.emit(result.events);
    if (allMonthPaymentsAnswered(this.state)) this.closeMonth();
    return {
      ok: true,
      paid: result.paid,
      debtCleared: result.debtCleared,
      stressDelta: result.stressDelta,
    };
  }

  answerCalendar(
    playerId: string,
    eventId: string,
    choice: CalendarChoiceId,
  ): Ack {
    if (this.finished) return { ok: false, error: "GAME_FINISHED" };
    if (this.isPastDeadline(this.calendarDeadline)) {
      this.closeCalendar();
      return { ok: false, error: "EVENT_CLOSED" };
    }
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
    if (this.isPastDeadline(this.turnDeadline)) {
      this.onTurnTimeout(this.state.pendingTurn?.turnId ?? turnId);
      return { ok: false, error: "STALE_VERSION" };
    }
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

  /**
   * invite:send (GDD 4.8 v1.12). Mengisi fromName dan deadline 15 detik. Tiap Ajakan punya
   * timer sendiri; beberapa Ajakan bisa terbuka sekaligus. `turnId` wajib dan harus giliran aktif.
   */
  sendInvite(
    senderId: string,
    cardId: string,
    targetId: string,
    turnId: string,
  ): Ack<{ inviteId: string; deadline: number }> {
    if (this.finished) return { ok: false, error: "GAME_FINISHED" };
    const result = sendInvite(this.state, senderId, cardId, targetId, turnId);
    if (!result.ok) return { ok: false, error: result.code, message: result.message };
    const now = this.runtime.clock.now();
    const deadline = now + INVITE_SECONDS * 1000;
    const inviteId = result.state.roundInvites[result.state.roundInvites.length - 1]!.inviteId;
    this.inviteDeadlines.set(inviteId, deadline);
    const events = result.events.map((event): DomainEvent => {
      if (event.type !== "invite:incoming") return event;
      const payload = {
        ...(event.payload as InviteIncomingPayload),
        fromName: this.identities[senderId]?.name ?? senderId,
        deadline,
      };
      this.openInvites.set(inviteId, { targetId, payload });
      return { ...event, payload } as DomainEvent;
    });
    this.state = result.state;
    this.inviteTimers.set(
      inviteId,
      this.runtime.clock.setTimeout(
        () => this.onInviteTimeout(inviteId),
        INVITE_SECONDS * 1000 + DEADLINE_GRACE_MS + 1,
      ),
    );
    this.emit(events, now);
    return { ok: true, inviteId, deadline };
  }

  /** invite:respond. Hanya mencatat jawaban; hasilnya muncul di Fase Pembalikan. */
  respondInvite(playerId: string, inviteId: string, answer: "join" | "decline"): Ack {
    if (this.finished) return { ok: false, error: "GAME_FINISHED" };
    if (this.isPastDeadline(this.inviteDeadlines.get(inviteId) ?? null)) {
      this.onInviteTimeout(inviteId);
      return { ok: false, error: "INVITE_EXPIRED" };
    }
    const result = respondInvite(this.state, playerId, inviteId, answer);
    if (!result.ok) return { ok: false, error: result.code, message: result.message };
    this.state = result.state;
    this.closeInvite(inviteId);
    return { ok: true };
  }

  private onInviteTimeout(inviteId: string): void {
    this.inviteTimers.delete(inviteId);
    if (this.finished) return;
    const result = expireInvite(this.state, inviteId);
    if (!result.ok) return;
    this.state = result.state;
    this.closeInvite(inviteId);
  }

  /** Ajakan dijawab atau habis waktu: bersihkan, lalu lanjutkan Fase Pembalikan bila ia yang ditunggu. */
  private closeInvite(inviteId: string): void {
    const timer = this.inviteTimers.get(inviteId);
    if (timer !== undefined) this.runtime.clock.clearTimeout(timer);
    this.inviteTimers.delete(inviteId);
    this.inviteDeadlines.delete(inviteId);
    this.openInvites.delete(inviteId);
    if (this.awaitingInvites && !hasOpenInvites(this.state)) {
      this.awaitingInvites = false;
      this.revealRound();
    }
  }

  private clearInviteTimers(): void {
    for (const timer of this.inviteTimers.values()) this.runtime.clock.clearTimeout(timer);
    this.inviteTimers.clear();
    this.inviteDeadlines.clear();
  }

  /**
   * Jalur snapshot sama ketatnya dengan dispatcher: payload yang disimpan divalidasi dengan skema
   * shared yang sama seperti event aslinya. Gagal -> log tanpa isi payload dan null.
   */
  private forSnapshot<T>(
    label: string,
    payload: unknown,
    parse: (value: unknown) => { success: true; data: T } | { success: false },
  ): T | null {
    const parsed = parse(payload);
    if (parsed.success) return parsed.data;
    console.error(`[snapshot] payload ${label} gagal validasi, dikirim null`);
    return null;
  }

  inviteCardFor(playerId: string): Snapshot["me"]["inviteCard"] {
    return this.state.players[playerId]?.inviteCard ?? null;
  }

  /** Ajakan terbuka milik pemain ini (sebagai target), dengan deadline aslinya. */
  pendingInviteFor(playerId: string): InviteIncomingPayload | null {
    for (const info of this.openInvites.values()) {
      if (info.targetId !== playerId) continue;
      return this.forSnapshot("pendingInvite", info.payload, (v) => InviteIncomingPayloadSchema.safeParse(v));
    }
    return null;
  }

  private runRound(): void {
    if (this.finished) return;
    const result = startRound(this.state, this.random);
    this.applyRoundResult(result);
    if (result.nextAction === "finished") return this.finish();
    if (this.state.phase === "monthChange") {
      // Debtor ditunggu sampai MONTH_PAY_SECONDS; tanpa debtor popup hanya tampil sebentar.
      const hasDebtors = hasMonthDebtors(this.state);
      const waitMs = hasDebtors ? this.timing.monthPaySeconds * 1000 : this.timing.monthSummaryOnlyMs;
      this.monthDeadline = hasDebtors ? this.runtime.clock.now() + waitMs : null;
      this.monthTimer = this.runtime.clock.setTimeout(
        () => this.closeMonth(),
        waitMs + (hasDebtors ? DEADLINE_GRACE_MS + 1 : 0),
      );
      return;
    }
    this.afterCalendarPhase();
  }

  /** Setelah Fase Kalender: timer Event Tanggal bila ada, selain itu giliran. */
  private afterCalendarPhase(): void {
    if (this.state.phase === "calendarEvent") {
      this.calendarDeadline = this.runtime.clock.now() + CALENDAR_SECONDS * 1000;
      this.calendarTimer = this.runtime.clock.setTimeout(
        () => this.closeCalendar(),
        CALENDAR_SECONDS * 1000 + DEADLINE_GRACE_MS + 1,
      );
      return;
    }
    this.runTurn();
  }

  private closeMonth(): void {
    if (this.finished || this.state.phase !== "monthChange") return;
    this.clearMonthTimer();
    const result = closeMonthChange(this.state);
    this.applyRoundResult(result);
    this.lastMonth.clear();
    this.afterCalendarPhase();
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
    const now = this.runtime.clock.now();
    this.applyRoundResult(result, now);
    const pending = this.state.pendingTurn;
    if (!pending) return this.nextRound();
    this.turnDeadline = now + this.turnSeconds * 1000;
    this.turnTimer = this.runtime.clock.setTimeout(
      () => this.onTurnTimeout(pending.turnId),
      this.turnSeconds * 1000 + DEADLINE_GRACE_MS + 1,
    );
  }

  private onTurnTimeout(turnId: string): void {
    this.clearTurnTimer();
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

  /**
   * Semua pemain sudah melangkah. Bila masih ada Ajakan terbuka, Fase Pembalikan ditunda
   * sampai semuanya dijawab atau habis waktu (maksimal 15 detik, D6).
   */
  private nextRound(): void {
    if (hasOpenInvites(this.state)) {
      this.awaitingInvites = true;
      return;
    }
    this.revealRound();
  }

  /** Fase Pembalikan (selalu, termasuk Langkah 24), lalu jeda animasi sebelum ronde berikutnya. */
  private revealRound(): void {
    const result = endRound(this.state, this.random);
    this.state = result.state;
    this.emit(result.events);
    if (result.nextAction === "finished") return this.finish();
    const reveal = result.events.find((event) => event.type === "round:reveal");
    const players = reveal?.type === "round:reveal" ? reveal.payload.order.length : 0;
    const delay = this.timing.revealStepMs * players;
    if (delay <= 0) return this.runRound();
    this.revealTimer = this.runtime.clock.setTimeout(() => {
      this.revealTimer = null;
      this.runRound();
    }, delay);
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.clearTimers();
    const result = finishGame(this.state, this.identities);
    this.state = result.state;
    this.runtime.send(result.events);
    this.requestFinalReflections(result.events);
    this.runtime.onFinished();
  }

  /** Eliminasi: buat refleksi pemain itu dari state saat ini, tanpa menahan game loop. */
  private requestEliminationReflections(events: readonly ServerEvent[]): void {
    for (const event of events) {
      if (event.type === "player:eliminated") this.requestReflection(event.payload.playerId, null);
    }
  }

  /** Game selesai: refleksi untuk semua pemain yang belum punya. */
  private requestFinalReflections(events: readonly ServerEvent[]): void {
    const finished = events.find((event) => event.type === "game:finished");
    const ranking = finished?.type === "game:finished" ? finished.payload.ranking : [];
    for (const playerId of Object.keys(this.state.players)) {
      const rank = ranking.find((row) => row.playerId === playerId)?.rank ?? null;
      this.requestReflection(playerId, rank);
    }
  }

  /**
   * Menghitung cadangan aturan lebih dulu, lalu (asinkron) meminta provider. Hasil dikirim hanya
   * ke pemilik lewat reflection:ready dan disimpan untuk snapshot.
   */
  private requestReflection(playerId: string, rank: number | null): void {
    if (this.reflectionRequested.has(playerId)) return;
    const fallback = buildPlayerReflection(this.state, playerId);
    const input = buildReflectionInput(this.state, playerId, rank);
    if (!fallback || !input) return;
    this.reflectionRequested.add(playerId);
    const service = this.runtime.reflection;
    const done = service ? service.create(input, fallback) : Promise.resolve(fallback);
    void done
      .catch(() => fallback)
      .then((reflection) => this.deliverReflection(playerId, reflection));
  }

  private deliverReflection(playerId: string, reflection: Reflection): void {
    if (this.closed) return; // sesi sudah ditutup: buang hasilnya
    this.reflections.set(playerId, reflection);
    this.runtime.send([
      {
        type: "reflection:ready",
        target: { kind: "player", playerId },
        payload: { gameId: this.state.public.gameId, playerId, reflection },
      },
    ]);
  }

  /** Refleksi milik pemain ini bila sudah siap (untuk snapshot). */
  reflectionFor(playerId: string): Reflection | null {
    const stored = this.reflections.get(playerId);
    if (!stored) return null;
    return this.forSnapshot("reflection", stored, (v) => ReflectionSchema.safeParse(v));
  }

  private applyRoundResult(result: RoundResult, now?: number): void {
    this.state = result.state;
    this.emit(result.events, now);
  }

  /** Mengisi deadline lalu mengirim. game:finished dikirim hanya oleh finish() (memakai identitas). */
  private emit(events: DomainEvent[], now = this.runtime.clock.now()): void {
    const filled = events
      .filter((event) => event.type !== "game:finished")
      .map((event): DomainEvent => {
        if (event.type === "calendar:event") {
          return {
            ...event,
            payload: { ...event.payload, deadline: now + CALENDAR_SECONDS * 1000 },
          };
        }
        if (event.type === "month:summary" && event.payload.payDebt) {
          return {
            ...event,
            payload: {
              ...event.payload,
              payDebt: {
                ...event.payload.payDebt,
                deadline: now + this.timing.monthPaySeconds * 1000,
              },
            },
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
    this.requestEliminationReflections(filled);
  }

  private clearCalendarTimer(): void {
    if (this.calendarTimer !== null) this.runtime.clock.clearTimeout(this.calendarTimer);
    this.calendarTimer = null;
    this.calendarDeadline = null;
  }

  private clearMonthTimer(): void {
    if (this.monthTimer !== null) this.runtime.clock.clearTimeout(this.monthTimer);
    this.monthTimer = null;
    this.monthDeadline = null;
  }

  private clearRevealTimer(): void {
    if (this.revealTimer !== null) this.runtime.clock.clearTimeout(this.revealTimer);
    this.revealTimer = null;
  }

  private clearTurnTimer(): void {
    if (this.turnTimer !== null) this.runtime.clock.clearTimeout(this.turnTimer);
    this.turnTimer = null;
    this.turnDeadline = null;
  }

  private isPastDeadline(deadline: number | null): boolean {
    return deadline !== null && this.runtime.clock.now() > deadline + DEADLINE_GRACE_MS;
  }

  /** State publik untuk snapshot. */
  publicState(): PublicGameState {
    return structuredClone({
      ...toPublicState(this.state),
      version: this.version,
      turnDeadline: this.turnDeadline,
    });
  }

  /** Id pemain yang sudah tereliminasi (untuk Main Lagi dan keluar dari room). */
  eliminatedPlayerIds(): string[] {
    return Object.entries(this.state.players)
      .filter(([, player]) => player.eliminated)
      .map(([playerId]) => playerId);
  }

  isEliminated(playerId: string): boolean {
    return this.state.players[playerId]?.eliminated === true;
  }

  nextVersion(): number {
    this.version += 1;
    return this.version;
  }

  /** Mengingat payload popup yang sedang berjalan supaya bisa dikirim ulang di snapshot. */
  recordEvent(event: ServerEvent, payload: unknown): void {
    if (event.type === "turn:options" || event.type === "turn:dead-end") {
      if (event.target.kind === "player") {
        this.lastTurn = {
          playerId: event.target.playerId,
          payload: payload as PendingTurnPayload,
        };
      }
    } else if (event.type === "game:finished") {
      this.result = payload as FinishedPayload;
    } else if (event.type === "calendar:event") {
      this.lastCalendar = payload as PendingCalendarPayload;
    } else if (event.type === "month:summary" && event.target.kind === "player") {
      this.lastMonth.set(event.target.playerId, payload as MonthSummaryPayload);
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
    if (this.lastTurn.payload.turnId !== pending.turnId) return null;
    return this.forSnapshot("pendingTurn", this.lastTurn.payload, (v) => {
      const normal = TurnOptionsPayloadSchema.safeParse(v);
      return normal.success ? normal : DeadEndPayloadSchema.safeParse(v);
    });
  }

  /** month:summary terakhir bila popup Ganti Bulan masih terbuka dan pemain ini debtor yang belum menjawab. */
  pendingMonthFor(playerId: string): PendingMonthPayload | null {
    const pending = this.state.pendingMonth;
    if (this.state.phase !== "monthChange" || !pending) return null;
    if (!pending.debtorIds.includes(playerId) || playerId in pending.answers) return null;
    const stored = this.lastMonth.get(playerId);
    if (!stored) return null;
    return this.forSnapshot("pendingMonth", stored, (v) => MonthSummaryPayloadSchema.safeParse(v));
  }

  pendingCalendarFor(playerId: string): PendingCalendarPayload | null {
    const pending = this.state.pendingCalendarEvent;
    if (!pending || playerId in pending.answers) return null;
    const player = this.state.players[playerId];
    if (!player || player.eliminated) return null;
    if (this.lastCalendar?.eventId !== pending.eventId) return null;
    return this.forSnapshot("pendingCalendar", this.lastCalendar, (v) => CalendarEventPayloadSchema.safeParse(v));
  }
}

export function identitiesFromRoom(
  players: ReadonlyArray<{
    playerId: string;
    name: string;
    avatarId: CharacterId;
  }>,
): Record<string, PlayerIdentity> {
  const identities: Record<string, PlayerIdentity> = {};
  for (const player of players) {
    identities[player.playerId] = { name: player.name, avatarId: player.avatarId };
  }
  return identities;
}
