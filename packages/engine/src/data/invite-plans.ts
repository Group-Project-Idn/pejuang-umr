import {
  InvitePlanDefinitionSchema,
  type InviteMotive,
  type InviteMotiveReveal,
  type InvitePlanDefinition,
} from "./schema";

// 4 Rencana Ajakan dari GDD 4.8. Nilai berlaku sama di semua mode.

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

type InviteMotiveEffects = {
  /** Efek Rencana berlaku pada target? */
  planAppliesToTarget: boolean;
  /** Efek tambahan untuk target (selain efek Rencana). */
  targetExtra: InvitePlanDefinition["effects"];
  /** Efek untuk pengirim (selain Level Stress -1 pada ajakan tulus). */
  senderExtra: InvitePlanDefinition["effects"];
  /** Efek bagi target saat menolak. */
  declineTarget: InvitePlanDefinition["effects"];
  /** Kepada siapa motif dibuka setelah jawaban. */
  revealMotiveTo: InviteMotiveReveal;
};

export const INVITE_MOTIVE_EFFECTS: Record<
  InviteMotive,
  { join: InviteMotiveEffects; decline: InviteMotiveEffects }
> = {
  sincere: {
    join: {
      planAppliesToTarget: true,
      targetExtra: [{ stat: "stress", delta: -1 }],
      senderExtra: [{ stat: "stress", delta: -1 }],
      declineTarget: [],
      revealMotiveTo: "target",
    },
    decline: {
      planAppliesToTarget: false,
      targetExtra: [],
      senderExtra: [],
      declineTarget: [{ stat: "stress", delta: 1 }],
      revealMotiveTo: "target",
    },
  },
  commission: {
    join: {
      planAppliesToTarget: true,
      targetExtra: [{ stat: "wealth", delta: -500_000 }],
      senderExtra: [{ stat: "wealth", delta: 500_000 }],
      declineTarget: [],
      revealMotiveTo: "target",
    },
    decline: {
      planAppliesToTarget: false,
      targetExtra: [],
      senderExtra: [],
      declineTarget: [{ stat: "stress", delta: -1 }],
      revealMotiveTo: "target",
    },
  },
};
