import {
  CalendarEventDefinitionSchema,
  type CalendarEventDefinition,
} from "./schema";

// 6 Event Tanggal dari GDD 3.3. Nilai disimpan dalam nilai Solo (persis tabel GDD).

const CALENDAR_EVENT_DEFINITIONS: CalendarEventDefinition[] = [
  {
    id: "new-year",
    name: "Tahun Baru",
    dateLabel: "1 Jan",
    multiplayerStep: 1,
    choices: {
      join: {
        effects: [
          { stat: "wealth", delta: -750_000 },
          { stat: "stress", delta: -2 },
        ],
      },
      skip: {
        effects: [{ stat: "health", delta: 1 }],
      },
    },
  },
  {
    id: "lebaran-thr",
    name: "Lebaran & THR",
    dateLabel: "Bln 3, tgl 15-21",
    multiplayerStep: 6,
    choices: {
      join: {
        effects: [
          { stat: "wealth", delta: 2_500_000 },
          { stat: "wealth", delta: -3_000_000 },
          { stat: "stress", delta: -2 },
        ],
      },
      skip: {
        effects: [
          { stat: "wealth", delta: 2_500_000 },
          { stat: "stress", delta: 1 },
        ],
      },
    },
  },
  {
    id: "labour-day",
    name: "Libur Hari Buruh",
    dateLabel: "1 Mei",
    multiplayerStep: 9,
    choices: {
      join: {
        effects: [
          { stat: "wealth", delta: -1_500_000 },
          { stat: "stress", delta: -2 },
          { stat: "health", delta: 1 },
        ],
      },
      skip: {
        effects: [
          { stat: "wealth", delta: 1_500_000 },
          { stat: "health", delta: -1 },
          { stat: "stress", delta: 1 },
        ],
      },
    },
  },
  {
    id: "wedding",
    name: "Kondangan Teman",
    dateLabel: "Bln 6, tgl 15-21",
    multiplayerStep: 12,
    choices: {
      join: {
        effects: [
          { stat: "wealth", delta: -1_000_000 },
          { stat: "stress", delta: -1 },
        ],
      },
      skip: {
        effects: [{ stat: "stress", delta: 1 }],
      },
    },
  },
  {
    id: "independence-day",
    name: "17 Agustus (Lomba & Kerja Bakti Warga)",
    dateLabel: "17 Agu",
    multiplayerStep: 16,
    choices: {
      join: {
        effects: [
          { stat: "wealth", delta: -250_000 },
          { stat: "stress", delta: -1 },
        ],
        chance: {
          pct: 25,
          effects: [{ stat: "wealth", delta: 750_000 }],
          text: "Menang lomba",
        },
      },
      skip: {
        effects: [],
      },
    },
  },
  {
    id: "harbolnas",
    name: "Harbolnas 11.11",
    dateLabel: "11 Nov",
    multiplayerStep: 21,
    choices: {
      join: {
        effects: [
          { stat: "wealth", delta: -1_500_000 },
          { stat: "stress", delta: -3 },
        ],
        chance: {
          pct: 30,
          effects: [{ stat: "stress", delta: 1 }],
          text: "Barang tidak sesuai",
        },
      },
      skip: {
        effects: [],
      },
      joinPaylater: {
        effects: [
          { stat: "debt", delta: 1_500_000 },
          { stat: "stress", delta: -3 },
        ],
        chance: {
          pct: 30,
          effects: [{ stat: "stress", delta: 1 }],
          text: "Barang tidak sesuai",
        },
      },
    },
  },
];

export const CALENDAR_EVENTS = CALENDAR_EVENT_DEFINITIONS.map((event) =>
  CalendarEventDefinitionSchema.parse(event),
);
