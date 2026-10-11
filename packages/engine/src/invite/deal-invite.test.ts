import { describe, expect, it } from "vitest";
import { INVITE_PLANS } from "../data";
import type { RandomSource } from "../random";
import { dealInviteCard, isInviteCardStep, pickInviteMotive } from "./deal-invite";

/** RandomSource deterministik (mulberry32) untuk tes distribusi. */
function seededRandom(seed: number): RandomSource {
  let a = seed;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const integer = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  return {
    integer,
    chance: (percent) => next() * 100 < percent,
    pick: (items) => items[integer(0, items.length - 1)]!,
  };
}

describe("isInviteCardStep", () => {
  it("hanya Langkah 1, 5, 9, 13, 17, 21", () => {
    const steps = Array.from({ length: 24 }, (_, i) => i + 1).filter(isInviteCardStep);
    expect(steps).toEqual([1, 5, 9, 13, 17, 21]);
  });
});

describe("pickInviteMotive", () => {
  it("10.000 undian mendekati 50/25/25 (toleransi 3%)", () => {
    const random = seededRandom(42);
    const counts = { sincere: 0, commission: 0, trap: 0 };
    const total = 10_000;
    for (let i = 0; i < total; i += 1) counts[pickInviteMotive(random)] += 1;
    expect(Math.abs(counts.sincere / total - 0.5)).toBeLessThanOrEqual(0.03);
    expect(Math.abs(counts.commission / total - 0.25)).toBeLessThanOrEqual(0.03);
    expect(Math.abs(counts.trap / total - 0.25)).toBeLessThanOrEqual(0.03);
  });
});

describe("dealInviteCard", () => {
  it("planEffects dari INVITE_PLANS tanpa dikali, expiresAtMonth = bulan + 2", () => {
    const card = dealInviteCard({ step: 5, month: 3, playerId: "a" }, seededRandom(1));
    const plan = INVITE_PLANS.find((p) => p.id === card.plan)!;
    expect(card.planEffects).toEqual(plan.effects);
    expect(card.expiresAtMonth).toBe(5);
    expect(card.cardId).toBe("invite-5-a");
  });

  it("expiresAtMonth dijepit ke 12 (Bulan 11 + 2)", () => {
    const card = dealInviteCard({ step: 21, month: 11, playerId: "a" }, seededRandom(1));
    expect(card.expiresAtMonth).toBe(12);
  });

  it("kelas plan dibagi rata", () => {
    const random = seededRandom(7);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 4000; i += 1) {
      const { plan } = dealInviteCard({ step: 1, month: 1, playerId: "a" }, random);
      counts[plan] = (counts[plan] ?? 0) + 1;
    }
    expect(Object.keys(counts)).toHaveLength(INVITE_PLANS.length);
    for (const n of Object.values(counts)) expect(Math.abs(n / 4000 - 0.25)).toBeLessThan(0.03);
  });
});
