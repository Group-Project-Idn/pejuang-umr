import { GoldTileDefinitionSchema, type GoldTileDefinition } from "./schema";

// 2 Petak Emas dari GDD 5.1. Kata "Emas" hanya punya Rencana, tidak punya Realita.
// Nilai disimpan seperti tabel tanpa dikali (sudah nilai Multiplayer).

const GOLD_TILE_DEFINITIONS: GoldTileDefinition[] = [
  {
    id: "full-scholarship",
    title: "Beasiswa Penuh",
    plan: [
      { stat: "wealth", delta: 7_500_000 },
      { stat: "stress", delta: -2 },
    ],
  },
  {
    id: "winning-giveaway",
    title: "Menang Giveaway",
    plan: [
      { stat: "wealth", delta: 5_000_000 },
      { stat: "health", delta: 1 },
    ],
  },
];

export const GOLD_TILES = GOLD_TILE_DEFINITIONS.map((tile) =>
  GoldTileDefinitionSchema.parse(tile),
);
