import type { InviteCard } from "@pejuang/shared";
import { INVITE_MOTIVE_WEIGHTS, INVITE_PLANS, type InviteMotive } from "../data";
import type { RandomSource } from "../random";

/** GDD 4.8: Kartu Ajakan dibagikan di awal Langkah 1, 5, 9, 13, 17, 21 (Bulan ganjil). */
const INVITE_CARD_STEPS: readonly number[] = [1, 5, 9, 13, 17, 21];

/** Kartu hangus 2 bulan setelah dibagikan (sebelum kartu berikutnya). */
const INVITE_CARD_LIFETIME_MONTHS = 2;

const MAX_MONTH = 12;

export function isInviteCardStep(step: number): boolean {
  return INVITE_CARD_STEPS.includes(step);
}

/** Motif diundi berbobot (Tulus 50, Komisi 25, Jebakan 25). */
export function pickInviteMotive(random: RandomSource): InviteMotive {
  const entries = Object.entries(INVITE_MOTIVE_WEIGHTS) as Array<[InviteMotive, number]>;
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random.integer(1, total);
  for (const [motive, weight] of entries) {
    if (roll <= weight) return motive;
    roll -= weight;
  }
  return entries[entries.length - 1]![0];
}

export function dealInviteCard(
  input: { step: number; month: number; playerId: string },
  random: RandomSource,
): InviteCard {
  const plan = random.pick(INVITE_PLANS);
  const motive = pickInviteMotive(random);
  return {
    cardId: `invite-${input.step}-${input.playerId}`,
    plan: plan.id,
    // Nilai sudah nilai Multiplayer (GDD 1.3), tidak dikali lagi.
    planEffects: plan.effects.map((effect) => ({ ...effect })),
    motive,
    // Skema membatasi bulan 1-12; kartu Bulan 11 dijepit ke Bulan 12.
    expiresAtMonth: Math.min(MAX_MONTH, input.month + INVITE_CARD_LIFETIME_MONTHS),
  };
}
