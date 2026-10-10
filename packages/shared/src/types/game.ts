import type { z } from "zod";
import type { CalendarEventPayload, Season } from "./calendar";
import type { InviteCard, InviteIncomingPayload } from "./invite";
import type { Effect, PawnId, PrivateStatus } from "./player";
import type { RoomState } from "./room";
import { HexCoordSchema } from "../schemas/common";
import {
  CalendarInfoSchema,
  GoldTileSchema,
  OpenedHexSchema,
  PublicGameStateSchema,
  ScoreRowSchema,
} from "../schemas/game";

export type HexCoord = z.infer<typeof HexCoordSchema>;
export type Category = z.infer<typeof OpenedHexSchema>["category"];
export type Outcome = NonNullable<
  z.infer<typeof OpenedHexSchema>["outcome"]
>;
export type Risk = "low" | "medium" | "high";

export type OpenedHex = z.infer<typeof OpenedHexSchema>;

export type GoldTile = z.infer<typeof GoldTileSchema>;

export type ScoreRow = z.infer<typeof ScoreRowSchema>;

export type PublicGameState = z.infer<typeof PublicGameStateSchema>;

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