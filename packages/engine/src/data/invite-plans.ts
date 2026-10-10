import {
  InvitePlanDefinitionSchema,
  type InviteMotive,
  type InvitePlanDefinition,
} from "./schema";

// 4 Rencana Ajakan dari GDD 4.8. Nilai sudah nilai Multiplayer, tidak dikali lagi.

const INVITE_PLAN_DEFINITIONS: InvitePlanDefinition[] = [
  {
    id: "hangout",
    title: "Ajak Nongkrong",
    effects: [
      { stat: "wealth", delta: -1_000_000 },
      { stat: "stress", delta: -3 },
    ],
  },
  {
    id: "morningRun",
    title: "Ajak Lari Pagi",
    effects: [
      { stat: "health", delta: 2 },
      { stat: "stress", delta: -2 },
    ],
  },
  {
    id: "jointProject",
    title: "Ajak Proyek Bareng",
    effects: [
      { stat: "wealth", delta: 5_000_000 },
      { stat: "health", delta: -2 },
    ],
  },
  {
    id: "staycation",
    title: "Ajak Staycation Patungan",
    effects: [
      { stat: "wealth", delta: -2_000_000 },
      { stat: "health", delta: 2 },
      { stat: "stress", delta: -3 },
    ],
  },
];

export const INVITE_PLANS = INVITE_PLAN_DEFINITIONS.map((plan) =>
  InvitePlanDefinitionSchema.parse(plan),
);

/** Peluang motif saat kartu didapat (GDD 4.8): Tulus 50%, Komisi 25%, Jebakan 25%. */
export const INVITE_MOTIVE_WEIGHTS: Record<InviteMotive, number> = {
  sincere: 50,
  commission: 25,
  trap: 25,
};

type InviteMotiveEffects = {
  /** Efek Rencana berlaku pada target? */
  planAppliesToTarget: boolean;
  /** Efek tambahan untuk target (selain efek Rencana). */
  targetExtra: InvitePlanDefinition["effects"];
  /** Efek untuk pengirim (selain Level Stress -1 pada ajakan tulus). */
  senderExtra: InvitePlanDefinition["effects"];
  /** Ajakan Tulus yang ditolak: target kena minus, motif dibuka ke semua. */
  declineWealthPenalty: number;
  /** Apakah motif dibuka setelah jawaban. */
  revealMotive: boolean;
};

export const INVITE_MOTIVE_EFFECTS: Record<InviteMotive, { join: InviteMotiveEffects; decline: InviteMotiveEffects }> = {
  sincere: {
    join: {
      planAppliesToTarget: true,
      targetExtra: [{ stat: "stress", delta: -1 }],
      senderExtra: [{ stat: "stress", delta: -1 }],
      declineWealthPenalty: 0,
      revealMotive: true,
    },
    decline: {
      planAppliesToTarget: false,
      targetExtra: [],
      senderExtra: [],
      declineWealthPenalty: -3_000_000,
      revealMotive: true,
    },
  },
  commission: {
    join: {
      planAppliesToTarget: true,
      targetExtra: [{ stat: "stress", delta: 2 }],
      senderExtra: [{ stat: "wealth", delta: 3_000_000 }],
      declineWealthPenalty: 0,
      revealMotive: false,
    },
    decline: {
      planAppliesToTarget: false,
      targetExtra: [],
      senderExtra: [],
      declineWealthPenalty: 0,
      revealMotive: false,
    },
  },
  trap: {
    join: {
      planAppliesToTarget: false,
      targetExtra: [
        { stat: "wealth", delta: -2_000_000 },
        { stat: "stress", delta: 2 },
      ],
      senderExtra: [],
      declineWealthPenalty: 0,
      revealMotive: true,
    },
    decline: {
      planAppliesToTarget: false,
      targetExtra: [],
      senderExtra: [],
      declineWealthPenalty: 0,
      revealMotive: false,
    },
  },
};
