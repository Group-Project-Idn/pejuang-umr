import {
  SeasonZonkDefinitionSchema,
  type SeasonZonkDefinition,
} from "./schema";

// 9 Zonk Musim dari GDD 3.4 (3 varian per musim). Nilai persis tabel GDD (1×).

const SEASON_ZONK_DEFINITIONS: SeasonZonkDefinition[] = [
  {
    id: "rainy-flooded-motorbike",
    season: "rainy",
    focus: "Banjir dan Kehujanan",
    title: "Motor Mogok Terendam Banjir",
    effects: [
      { stat: "wealth", delta: -500_000 },
      { stat: "stress", delta: 1 },
    ],
  },
  {
    id: "rainy-leaky-room",
    season: "rainy",
    focus: "Banjir dan Kehujanan",
    title: "Atap Kos Bocor, Barang Rusak",
    effects: [
      { stat: "wealth", delta: -300_000 },
    ],
  },
  {
    id: "rainy-ojol-surge",
    season: "rainy",
    focus: "Banjir dan Kehujanan",
    title: "Tarif Ojol Naik Saat Hujan",
    effects: [
      { stat: "wealth", delta: -150_000 },
      { stat: "stress", delta: 1 },
    ],
  },
  {
    id: "dry-electricity-bill",
    season: "dry",
    focus: "Panas dan Polusi",
    title: "Tagihan Listrik Naik karena Kipas dan AC",
    effects: [
      { stat: "wealth", delta: -250_000 },
    ],
  },
  {
    id: "dry-pam-water-outage",
    season: "dry",
    focus: "Panas dan Polusi",
    title: "Air PAM Mati, Beli Air Galon",
    effects: [
      { stat: "wealth", delta: -200_000 },
      { stat: "stress", delta: 1 },
    ],
  },
  {
    id: "dry-dusty-motorbike",
    season: "dry",
    focus: "Panas dan Polusi",
    title: "Motor Penuh Debu, Cuci dan Servis Ringan",
    effects: [
      { stat: "wealth", delta: -150_000 },
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
