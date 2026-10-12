import type { z } from "zod";
import { CategorySchema, HexCoordSchema, OutcomeSchema, RiskSchema } from "../schemas/common";
import {
  DeadEndPayloadSchema,
  GameFinishedPayloadSchema,
  GoldTileSchema,
  OpenedHexSchema,
  PublicGameStateSchema,
  ReflectionSchema,
  RevealedRealitySchema,
  RiskTagSchema,
  ScoreRowSchema,
  SnapshotSchema,
  TileOptionSchema,
  TurnOptionsPayloadSchema,
} from "../schemas/game";

export type HexCoord = z.infer<typeof HexCoordSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Outcome = z.infer<typeof OutcomeSchema>;
export type Risk = z.infer<typeof RiskSchema>;

export type OpenedHex = z.infer<typeof OpenedHexSchema>;

export type GoldTile = z.infer<typeof GoldTileSchema>;

export type ScoreRow = z.infer<typeof ScoreRowSchema>;

export type PublicGameState = z.infer<typeof PublicGameStateSchema>;

export type RiskTag = z.infer<typeof RiskTagSchema>;

export type TileOption = z.infer<typeof TileOptionSchema>;

export type TurnOptionsPayload = z.infer<typeof TurnOptionsPayloadSchema>;

export type DeadEndPayload = z.infer<typeof DeadEndPayloadSchema>;

export type GameFinishedPayload = z.infer<typeof GameFinishedPayloadSchema>;

export type Snapshot = z.infer<typeof SnapshotSchema>;

export type RevealedReality = z.infer<typeof RevealedRealitySchema>;

export type Reflection = z.infer<typeof ReflectionSchema>;
