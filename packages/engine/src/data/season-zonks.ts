import {
  SeasonZonkDefinitionSchema,
  type SeasonZonkDefinition,
} from "./schema";

// 9 Zonk Musim dari GDD 3.4 (3 varian per musim). Nilai Solo persis tabel GDD.

const SEASON_ZONK_DEFINITIONS: SeasonZonkDefinition[] = [
  {
    id: "rainy-mud-engine",
    season: "rainy",
    focus: "Cuci Kendaraan",
    title: "Motor Kena Lumpur Banjir",
    effects: [
      { stat: "wealth", delta: -250_000 },
      { stat: "stress", delta: 1 },
    ],
  },
  {
    id: "rainy-wet-oil-change",
    season: "rainy",
    focus: "Cuci Kendaraan",
    title: "Cuci dan Ganti Oli Habis Kehujanan",
    effects: [{ stat: "wealth", delta: -500_000 }],
  },
  {
    id: "rainy-moldy-body",
    season: "rainy",
    focus: "Cuci Kendaraan",
    title: "Bodi dan Jok Berjamur",
    effects: [
      { stat: "wealth", delta: -750_000 },
      { stat: "stress", delta: 1 },
    ],
  },
  {
    id: "dry-overheat-engine",
    season: "dry",
    focus: "Kendaraan Rusak",
    title: "Mesin Overheat",
    effects: [
      { stat: "wealth", delta: -1_500_000 },
      { stat: "stress", delta: 1 },
    ],
  },
  {
    id: "dry-dead-battery",
    season: "dry",
    focus: "Kendaraan Rusak",
    title: "Aki Soak",
    effects: [{ stat: "wealth", delta: -1_000_000 }],
  },
  {
    id: "dry-burst-tire",
    season: "dry",
    focus: "Kendaraan Rusak",
    title: "Ban Pecah di Aspal Panas",
    effects: [
      { stat: "wealth", delta: -750_000 },
      { stat: "stress", delta: 1 },
    ],
  },
  {
    id: "transition-fever",
    season: "transition",
    focus: "Sakit",
    title: "Demam Pancaroba",
    effects: [
      { stat: "health", delta: -2 },
      { stat: "stress", delta: 1 },
    ],
  },
  {
    id: "transition-flu-cough",
    season: "transition",
    focus: "Sakit",
    title: "Flu dan Batuk",
    effects: [
      { stat: "health", delta: -2 },
      { stat: "wealth", delta: -250_000 },
    ],
  },
  {
    id: "transition-feverish-day",
    season: "transition",
    focus: "Sakit",
    title: "Meriang Seharian",
    effects: [
      { stat: "health", delta: -1 },
      { stat: "stress", delta: 2 },
    ],
  },
];

export const SEASON_ZONKS = SEASON_ZONK_DEFINITIONS.map((zonk) =>
  SeasonZonkDefinitionSchema.parse(zonk),
);
