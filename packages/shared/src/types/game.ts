import type { CalendarEventPayload, CalendarInfo, Season } from "./calendar";
import type { InviteCard, InviteIncomingPayload } from "./invite";
import type { Effect, PawnId, PrivateStatus } from "./player";
import type { RoomState } from "./room";

export type HexCoord = { q: number; r: number };
export type Category = "work" | "social" | "health" | "finance" | "gold";
export type Outcome = "zonk" | "safe" | "lucky";
export type Risk = "low" | "medium" | "high";

export type OpenedHex = {
  hex: HexCoord;
  category: Category;
  title: string;
  outcome: Outcome | null;
  byPlayerId: string;
  step: number;
};

export type GoldTile = {
  goldId: string;
  hex: HexCoord;
  title: string;
  plan: Effect[];
  expiresAtStep: number;
};

export type ScoreRow = {
  playerId: string;
  provisionalScore: number;
  rank: number;
  eliminated: boolean;
};

export type PublicGameState = {
  version: number;
  gameId: string;
  boardRadius: 4 | 5 | 6;
  calendar: CalendarInfo;
  turnOrder: string[];
  activePlayerId: string | null;
  turnDeadline: number | null;
  turnPaused: boolean;
  pawns: Array<{ playerId: string; hex: HexCoord }>;
  openedHexes: OpenedHex[];
  deadHexes: HexCoord[];
  gold: GoldTile | null;
  scores: ScoreRow[];
  rankOneBurden: string[];
  eliminated: string[];
  spectators: string[];
};

export type RiskTag =
  | { type: "rankOne"; plusPct: 15 }
  | { type: "season"; season: Season; plusPct: 10 }
  | { type: "immune"; reason: "health>=8" };

export type TileOption = {
  hex: HexCoord;
  category: Category;
  title: string;
  plan: Effect[];
  risk: Risk | null;
  riskTags: RiskTag[];
  isGold: boolean;
};

export type TurnOptionsPayload = {
  turnId: string;
  options: TileOption[];
};

export type DeadEndPayload = {
  turnId: string;
  options: Array<TileOption & { distance: number }>;
  stressPenalty: 1;
};

export type GameFinishedPayload = {
  version: number;
  ranking: Array<{
    rank: number;
    playerId: string;
    name: string;
    pawn: PawnId;
    finalScore: number;
    netWorth: number;
    modifier: "penalty" | "bonus" | "none";
    modifierPct: -50 | 20 | 0;
    eliminated: boolean;
    eliminatedAtStep: number | null;
  }>;
};

export type Snapshot = {
  serverTime: number;
  room: RoomState;
  game: PublicGameState | null;
  me: {
    playerId: string;
    status: PrivateStatus | null;
    inviteCard: InviteCard | null;
    pendingTurn: TurnOptionsPayload | DeadEndPayload | null;
    pendingCalendar: CalendarEventPayload | null;
    pendingInvite: InviteIncomingPayload | null;
    isSpectator: boolean;
  };
  result: GameFinishedPayload | null;
};