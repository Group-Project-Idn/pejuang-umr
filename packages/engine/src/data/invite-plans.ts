import {
  InvitePlanDefinitionSchema,
  type InviteMotive,
  type InvitePlanDefinition,
} from "./schema";

// 4 Rencana Ajakan dari GDD 4.8 v1.12. Nilai dipakai apa adanya (1×).

const INVITE_PLAN_DEFINITIONS: InvitePlanDefinition[] = [
  {
    id: "hangout",
    title: "Ajak Nongkrong",
    effects: [
      { stat: "wealth", delta: -500_000 },
      { stat: "stress", delta: -2 },
    ],
  },
  {
    id: "morningRun",
    title: "Ajak Lari Pagi",
    effects: [
      { stat: "health", delta: 1 },
      { stat: "stress", delta: -1 },
    ],
  },
  {
    id: "jointProject",
    title: "Ajak Proyek Bareng",
    effects: [
      { stat: "wealth", delta: 1_500_000 },
      { stat: "health", delta: -1 },
    ],
  },
  {
    id: "staycation",
    title: "Ajak Staycation Patungan",
    effects: [
      { stat: "wealth", delta: -1_000_000 },
      { stat: "health", delta: 1 },
      { stat: "stress", delta: -2 },
    ],
  },
];

export const INVITE_PLANS = INVITE_PLAN_DEFINITIONS.map((plan) =>
  InvitePlanDefinitionSchema.parse(plan),
);

/** Peluang motif saat kartu didapat (GDD 4.8 v1.12): Tulus 50%, Komisi 50%. */
export const INVITE_MOTIVE_WEIGHTS: Record<InviteMotive, number> = {
  sincere: 50,
  commission: 50,
};

type InviteOutcomeRule = {
  /** Efek Rencana berlaku pada target? */
  planAppliesToTarget: boolean;
  /** Efek tambahan untuk target (selain efek Rencana). */
  targetExtra: InvitePlanDefinition["effects"];
  /** Efek untuk pengirim. */
  senderExtra: InvitePlanDefinition["effects"];
};

/** Hasil Ajakan per motif dan jawaban (GDD 4.8 v1.12). Motif dibuka ke pengirim dan target. */
export const INVITE_MOTIVE_EFFECTS: Record<
  InviteMotive,
  { join: InviteOutcomeRule; decline: InviteOutcomeRule }
> = {
  sincere: {
    join: {
      planAppliesToTarget: true,
      targetExtra: [{ stat: "stress", delta: -1 }],
      senderExtra: [{ stat: "stress", delta: -1 }],
    },
    decline: {
      planAppliesToTarget: false,
      targetExtra: [{ stat: "stress", delta: 1 }],
      senderExtra: [],
    },
  },
  commission: {
    join: {
      planAppliesToTarget: true,
      targetExtra: [{ stat: "wealth", delta: -500_000 }],
      senderExtra: [{ stat: "wealth", delta: 500_000 }],
    },
    decline: {
      planAppliesToTarget: false,
      targetExtra: [{ stat: "stress", delta: -1 }],
      senderExtra: [],
    },
  },
};
