import type { Effect } from "./player";

export type InvitePlan =
  | "hangout"
  | "morningRun"
  | "jointProject"
  | "staycation";

export type InviteMotive = "sincere" | "commission" | "trap";

export type InviteCard = {
  cardId: string;
  plan: InvitePlan;
  planEffects: Effect[];
  motive: InviteMotive;
  expiresAtMonth: number;
};

export type InviteIncomingPayload = {
  inviteId: string;
  fromPlayerId: string;
  fromName: string;
  plan: InvitePlan;
  planEffects: Effect[];
  deadline: number;
};

export type InviteResolvedPayload = {
  inviteId: string;
  fromPlayerId: string;
  targetPlayerId: string;
  answer: "join" | "decline";
  autoDeclined: boolean;
  motive: InviteMotive | null;
  effectsForYou: Effect[];
};