import type { AckCallback } from "../common/ack";
import type { ServerErrorPayload } from "../common/errors";
import type { RequestPayload } from "../common/request";
import type { CalendarEventPayload, CalendarResultPayload, Season } from "../types/calendar";
import type {
  DeadEndPayload,
  GameFinishedPayload,
  GoldTile,
  HexCoord,
  Outcome,
  PublicGameState,
  ScoreRow,
  Snapshot,
  TurnOptionsPayload,
} from "../types/game";
import type { InviteCard, InviteIncomingPayload, InviteResolvedPayload } from "../types/invite";
import type { Effect, PawnId, PrivateStatus } from "../types/player";
import type { RoomState } from "../types/room";

type RoomResult = { room: RoomState };

export interface ClientToServerEvents {
  "ping:test": (
    payload: { name: string },
    ack: AckCallback<{ message: string }>,
  ) => void;
  "session:resume": (
    payload: RequestPayload & { roomCode: string },
    ack: AckCallback<{ snapshot: Snapshot }>,
  ) => void;
  "room:create": (payload: RequestPayload, ack: AckCallback<RoomResult>) => void;
  "room:join": (
    payload: RequestPayload & { roomCode: string },
    ack: AckCallback<RoomResult>,
  ) => void;
  "room:leave": (payload: RequestPayload, ack: AckCallback) => void;
  "room:ready": (
    payload: RequestPayload & { ready: boolean },
    ack: AckCallback,
  ) => void;
  "room:pawn": (
    payload: RequestPayload & { pawn: PawnId },
    ack: AckCallback,
  ) => void;
  "room:timer": (
    payload: RequestPayload & { turnSeconds: 30 | 60 },
    ack: AckCallback,
  ) => void;
  "room:kick": (
    payload: RequestPayload & { targetPlayerId: string },
    ack: AckCallback,
  ) => void;
  "room:rematch": (payload: RequestPayload, ack: AckCallback<RoomResult>) => void;
  "game:start": (payload: RequestPayload, ack: AckCallback) => void;
  "calendar:answer": (
    payload: RequestPayload & {
      eventId: string;
      choice: "join" | "joinPaylater" | "skip";
    },
    ack: AckCallback,
  ) => void;
  "turn:choose": (
    payload: RequestPayload & { turnId: string; hex: HexCoord },
    ack: AckCallback,
  ) => void;
  "turn:jump": (
    payload: RequestPayload & { turnId: string; hex: HexCoord },
    ack: AckCallback,
  ) => void;
  "spectate:enter": (
    payload: RequestPayload,
    ack: AckCallback<{ snapshot: Snapshot }>,
  ) => void;
  "invite:send": (
    payload: RequestPayload & { cardId: string; targetPlayerId: string },
    ack: AckCallback<{ inviteId: string; deadline: number }>,
  ) => void;
  "invite:respond": (
    payload: RequestPayload & { inviteId: string; answer: "join" | "decline" },
    ack: AckCallback,
  ) => void;
  "emote:send": (
    payload: RequestPayload & { emoteId: string },
    ack: AckCallback,
  ) => void;
}

export interface ServerToClientEvents {
  "session:snapshot": (payload: Snapshot) => void;
  "player:connection": (payload: {
    version?: number;
    playerId: string;
    connected: boolean;
    at: number;
  }) => void;
  error: (payload: ServerErrorPayload) => void;
  "room:kicked": (payload: { roomCode: string }) => void;
  "room:state": (payload: RoomState) => void;
  "room:countdown": (payload: { deadline: number; seconds: 3 }) => void;
  "game:started": (payload: {
    version: number;
    serverTime: number;
    gameId: string;
    boardRadius: 4 | 5 | 6;
    turnSeconds: 30 | 60;
    turnOrder: string[];
    startPositions: Array<{ playerId: string; hex: HexCoord }>;
    calendar: PublicGameState["calendar"];
  }) => void;
  "game:finished": (payload: GameFinishedPayload) => void;
  "game:patch": (payload: {
    version: number;
    ops: Array<
      | { type: "scores"; scores: ScoreRow[] }
      | { type: "rankOneBurden"; playerIds: string[] }
      | { type: "calendar"; calendar: PublicGameState["calendar"] }
      | { type: "inviteSincereDeclined"; fromPlayerId: string; targetPlayerId: string }
    >;
  }) => void;
  "player:status": (payload: PrivateStatus) => void;
  "calendar:event": (payload: CalendarEventPayload) => void;
  "calendar:result": (payload: CalendarResultPayload) => void;
  "season:changed": (payload: {
    version: number;
    season: Season;
    vulnerableCategories: Array<"work" | "social" | "health" | "finance" | "gold">;
    zonkFocus: "vehicleWash" | "vehicleBreakdown" | "sick";
  }) => void;
  "month:summary": (payload: {
    month: number;
    salary: 5_730_000;
    livingCost: 4_600_000;
    interest: number;
    interestAddedToDebt: number;
    doomAmount: number | null;
    before: PrivateStatus;
    after: PrivateStatus;
  }) => void;
  "turn:start": (payload: {
    version: number;
    turnId: string;
    playerId: string;
    deadline: number;
    turnSeconds: 30 | 60;
  }) => void;
  "turn:options": (payload: TurnOptionsPayload) => void;
  "turn:dead-end": (payload: DeadEndPayload) => void;
  "turn:timer": (payload: {
    version: number;
    turnId: string;
    paused: boolean;
    deadline: number | null;
    remainingMs: number;
  }) => void;
  "tile:opened": (payload: {
    version: number;
    turnId: string;
    playerId: string;
    from: HexCoord;
    to: HexCoord;
    category: "work" | "social" | "health" | "finance" | "gold";
    title: string;
    plan: Effect[];
    isGold: boolean;
    viaJump: boolean;
    autoPicked: boolean;
  }) => void;
  "tile:resolved": (payload: {
    version: number;
    turnId: string;
    playerId: string;
    hex: HexCoord;
    outcome: Outcome;
    text: string;
    effects: Effect[];
    seasonal: boolean;
  }) => void;
  "gold:spawned": (payload: { version: number; gold: GoldTile }) => void;
  "gold:expired": (payload: { version: number; goldId: string; hex: HexCoord }) => void;
  "doom:triggered": (payload: {
    amount: number;
    trigger: "month" | "tile";
    stressAfter: number;
  }) => void;
  "player:eliminated": (payload: {
    version: number;
    playerId: string;
    reason: "bankrupt" | "burnout";
    step: number;
  }) => void;
  "invite:card": (payload: {
    card: InviteCard | null;
    expiredCardId: string | null;
  }) => void;
  "invite:incoming": (payload: InviteIncomingPayload) => void;
  "invite:resolved": (payload: InviteResolvedPayload) => void;
  "emote:shown": (payload: { playerId: string; emoteId: string; at: number }) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  playerId: string;
  name: string;
  avatarId: string;
}