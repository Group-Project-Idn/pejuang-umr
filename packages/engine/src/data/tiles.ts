import { TileDefinitionSchema, type TileDefinition } from "./schema";

// Katalog petak dari GDD 5.1 (rencana) dan 5.2 (tumpukan realita).
// Nilai persis tabel GDD (1×), dipakai apa adanya.

const TILE_DEFINITIONS: TileDefinition[] = [
  {
    id: "overtime-project",
    category: "work",
    title: "Lembur Proyek",
    plan: [{ stat: "wealth", delta: 2_500_000 }],
    baseZonkPct: 30,
    realityPool: "work",
  },
  {
    id: "quick-freelance",
    category: "work",
    title: "Freelance Kilat",
    plan: [
      { stat: "wealth", delta: 1_500_000 },
      { stat: "health", delta: -1 },
    ],
    baseZonkPct: 20,
    realityPool: "work",
  },
  {
    id: "outstation-trip",
    category: "work",
    title: "Dinas Luar Kota",
    plan: [
      { stat: "wealth", delta: 2_000_000 },
      { stat: "stress", delta: 1 },
    ],
    baseZonkPct: 25,
    realityPool: "work",
  },
  {
    id: "hanging-out",
    category: "social",
    title: "Nongkrong",
    plan: [
      { stat: "wealth", delta: -500_000 },
      { stat: "stress", delta: -2 },
    ],
    baseZonkPct: 20,
    realityPool: "social",
  },
  {
    id: "old-friend-meetup",
    category: "social",
    title: "Ketemu Teman Lama",
    plan: [
      { stat: "wealth", delta: -250_000 },
      { stat: "stress", delta: -1 },
    ],
    baseZonkPct: 10,
    realityPool: "social",
  },
  {
    id: "arisan",
    category: "social",
    title: "Arisan",
    plan: [
      { stat: "wealth", delta: -750_000 },
      { stat: "stress", delta: -1 },
    ],
    baseZonkPct: 25,
    realityPool: "social",
  },
  {
    id: "day-trip",
    category: "social",
    title: "Jalan-jalan",
    plan: [
      { stat: "wealth", delta: -1_000_000 },
      { stat: "health", delta: 1 },
      { stat: "stress", delta: -2 },
    ],
    baseZonkPct: 20,
    realityPool: "social",
  },
  {
    id: "buying-vitamins",
    category: "health",
    title: "Beli Vitamin",
    plan: [
      { stat: "wealth", delta: -250_000 },
      { stat: "health", delta: 2 },
    ],
    baseZonkPct: 10,
    realityPool: "health",
  },
  {
    id: "morning-exercise",
    category: "health",
    title: "Olahraga Pagi",
    plan: [
      { stat: "health", delta: 1 },
      { stat: "stress", delta: -1 },
    ],
    baseZonkPct: 20,
    realityPool: "health",
  },
  {
    id: "full-rest",
    category: "health",
    title: "Istirahat Penuh",
    plan: [
      { stat: "health", delta: 2 },
      { stat: "stress", delta: -1 },
    ],
    baseZonkPct: 10,
    realityPool: "health",
  },
  {
    id: "online-loan",
    category: "finance",
    title: "Pinjol / Paylater",
    plan: [
      { stat: "wealth", delta: 5_000_000 },
      { stat: "debt", delta: 5_000_000 },
      { stat: "stress", delta: 1 },
    ],
    baseZonkPct: 35,
    realityPool: "finance-debt",
  },
  {
    id: "self-reward-shopping",
    category: "finance",
    title: "Belanja Self-Reward",
    plan: [
      { stat: "wealth", delta: -1_000_000 },
      { stat: "stress", delta: -2 },
    ],
    baseZonkPct: 30,
    realityPool: "finance",
  },
];

export const TILES = TILE_DEFINITIONS.map((tile) =>
  TileDefinitionSchema.parse(tile),
);
