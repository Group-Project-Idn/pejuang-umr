import { describe, expect, it } from "vitest";
import { ReflectionSchema, type PrivateStatus } from "@pejuang/shared";
import type { DecisionEntry } from "../log/decision-log";
import { playRandomGame } from "../turn/simulation-helpers";
import { buildPlayerReflection, buildRuleInsights, getDecisionLog } from "./rules-insight";

const status = (patch: Partial<PrivateStatus> = {}): PrivateStatus => ({
  wealth: 8_000_000,
  debt: 0,
  debtLimit: 25_000_000,
  health: 8,
  stress: 3,
  ...patch,
});

const loanTile = (step: number): DecisionEntry => ({
  kind: "tile",
  step,
  tileId: "online-loan",
  category: "finance",
  title: "Pinjol / Paylater",
  plan: [],
  autoPicked: false,
  viaJump: false,
  reality: null,
});

const roundEnd = (step: number, patch: Partial<Extract<DecisionEntry, { kind: "roundEnd" }>> = {}): DecisionEntry => ({
  kind: "roundEnd",
  step,
  wealth: 5_000_000,
  debt: 0,
  health: 8,
  stress: 3,
  ...patch,
});

const payment = (step: number, amount: number): DecisionEntry => ({
  kind: "debtPayment",
  step,
  month: Math.ceil(step / 2),
  amount,
  debtBefore: 3_000_000,
  cleared: false,
});

function check(log: DecisionEntry[], final: PrivateStatus) {
  const reflection = buildRuleInsights(log, final);
  expect(ReflectionSchema.safeParse(reflection).success).toBe(true);
  expect(reflection.source).toBe("rules");
  expect(reflection.insights.length).toBeGreaterThanOrEqual(1);
  expect(reflection.insights.length).toBeLessThanOrEqual(3);
  const sentences = reflection.summary.split(/\.(\s|$)/).filter((part) => part.trim().length > 4);
  expect(sentences.length).toBeGreaterThanOrEqual(1);
  expect(sentences.length).toBeLessThanOrEqual(2);
  for (const insight of reflection.insights) {
    expect(insight.reference).toBeUndefined();
    expect(insight.title.length).toBeGreaterThan(0);
  }
  return reflection;
}

const titles = (log: DecisionEntry[], final: PrivateStatus) =>
  check(log, final).insights.map((insight) => insight.title);

describe("buildRuleInsights (GDD 6.5)", () => {
  it("log kosong tetap menghasilkan refleksi valid dengan insight cadangan", () => {
    const reflection = check([], status());
    expect(reflection.insights[0]!.title).toBe("Keuangan tetap sehat");
  });

  it("sering memilih Pinjol / Paylater: menyebut jumlah pilihan dan Hutang akhir", () => {
    const log = [loanTile(1), loanTile(3), loanTile(5), roundEnd(5)];
    const reflection = check(log, status({ debt: 12_000_000 }));
    const loan = reflection.insights.find((insight) => insight.title.includes("Pinjol"))!;
    expect(loan.body).toContain("3 kali");
    expect(loan.body).toContain("Rp12.000.000");
    expect(loan.body).toContain("kamu");
  });

  it("sekali Pinjol belum dianggap pola", () => {
    expect(titles([loanTile(1)], status())).not.toContain("Pinjol / Paylater jadi andalan");
  });

  it("Doom Spending berulang menyebut total", () => {
    const log: DecisionEntry[] = [
      { kind: "doom", step: 4, amount: 750_000 },
      { kind: "doom", step: 8, amount: 1_000_000 },
    ];
    const reflection = check(log, status());
    const doom = reflection.insights.find((insight) => insight.title === "Doom Spending berulang")!;
    expect(doom.body).toContain("2 kali");
    expect(doom.body).toContain("Rp1.750.000");
  });

  it("Kesehatan rendah lebih dari beberapa ronde", () => {
    const log = [roundEnd(1, { health: 2 }), roundEnd(2, { health: 3 }), roundEnd(3, { health: 1 }), roundEnd(4)];
    const found = titles(log, status({ health: 2 }));
    expect(found).toContain("Kesehatan sering rendah");
  });

  it("Level Stress tinggi lama", () => {
    const log = [roundEnd(1, { stress: 9 }), roundEnd(2, { stress: 8 }), roundEnd(3, { stress: 10 })];
    expect(titles(log, status({ stress: 9 }))).toContain("Level Stress tinggi cukup lama");
  });

  it("pola Bayar Hutang: selalu Rp0 vs rutin", () => {
    const never = [payment(3, 0), payment(5, 0), payment(7, 0)];
    expect(titles(never, status({ debt: 3_000_000 }))).toContain("Hutang belum dicicil");
    const routine = [payment(3, 500_000), payment(5, 1_000_000)];
    const reflection = check(routine, status());
    const found = reflection.insights.find((insight) => insight.title === "Rutin Bayar Hutang")!;
    expect(found.body).toContain("Rp1.500.000");
    const mixed = [payment(3, 0), payment(5, 500_000)];
    expect(titles(mixed, status())).not.toContain("Hutang belum dicicil");
    expect(titles(mixed, status())).not.toContain("Rutin Bayar Hutang");
  });

  it("pola Ajakan: sering ikut Komisi", () => {
    const result = (motive: "sincere" | "commission", answer: "join" | "decline"): DecisionEntry => ({
      kind: "inviteResult",
      step: 3,
      role: "target",
      otherPlayerId: "x",
      plan: "hangout",
      answer,
      autoDeclined: false,
      motive,
    });
    const log = [result("commission", "join"), result("commission", "join"), result("sincere", "join")];
    const reflection = check(log, status());
    expect(reflection.insights.map((insight) => insight.title)).toContain("Sering ikut Ajakan Komisi");
    const declined = [result("commission", "decline"), result("commission", "decline")];
    expect(titles(declined, status())).not.toContain("Sering ikut Ajakan Komisi");
  });

  it("memilih paling banyak 3 insight, yang paling penting lebih dulu", () => {
    const log: DecisionEntry[] = [
      loanTile(1),
      loanTile(3),
      { kind: "doom", step: 4, amount: 750_000 },
      { kind: "doom", step: 6, amount: 750_000 },
      roundEnd(1, { health: 1, stress: 9 }),
      roundEnd(2, { health: 1, stress: 9 }),
      roundEnd(3, { health: 1, stress: 9 }),
      payment(3, 0),
      payment(5, 0),
    ];
    const reflection = check(log, status({ debt: 9_000_000, health: 1, stress: 9 }));
    expect(reflection.insights).toHaveLength(3);
    expect(reflection.insights[0]!.title).toBe("Pinjol / Paylater jadi andalan");
  });

  it("memakai istilah glosarium dan sapaan kamu, tanpa nada menghakimi", () => {
    const log = [loanTile(1), loanTile(3), { kind: "doom", step: 4, amount: 750_000 } as DecisionEntry, { kind: "doom", step: 8, amount: 750_000 } as DecisionEntry];
    const text = JSON.stringify(check(log, status({ debt: 6_000_000 })));
    expect(text).toContain("kamu");
    for (const term of ["Hutang", "Level Stress", "Doom Spending"]) expect(text).toContain(term);
    for (const harsh of ["bodoh", "salahmu", "ceroboh", "payah"]) expect(text.toLowerCase()).not.toContain(harsh);
  });

  it("fungsi murni: masukan tidak berubah dan hasil sama untuk masukan sama", () => {
    const log = [loanTile(1), loanTile(3)];
    const copy = JSON.stringify(log);
    const a = buildRuleInsights(log, status());
    const b = buildRuleInsights(log, status());
    expect(a).toEqual(b);
    expect(JSON.stringify(log)).toBe(copy);
  });
});

describe("log keputusan dan refleksi dari game nyata", () => {
  it("mencatat petak, Realita, indikator akhir ronde, dan refleksi valid per pemain", () => {
    const { state, playerIds } = playRandomGame(3, 7);
    for (const playerId of playerIds) {
      const log = getDecisionLog(state, playerId);
      const tiles = log.filter((entry) => entry.kind === "tile");
      expect(tiles.length).toBeGreaterThan(0);
      for (const tile of tiles) {
        if (tile.kind !== "tile" || tile.category === "gold") continue;
        expect(tile.reality).not.toBeNull(); // Realita terisi di Fase Pembalikan
      }
      expect(log.filter((entry) => entry.kind === "roundEnd").length).toBeGreaterThan(0);
      expect(log.some((entry) => entry.kind === "calendar")).toBe(true);
      expect(ReflectionSchema.safeParse(buildPlayerReflection(state, playerId)).success).toBe(true);
    }
    expect(buildPlayerReflection(state, "tidak-ada")).toBeNull();
    // getDecisionLog mengembalikan salinan.
    const copy = getDecisionLog(state, playerIds[0]!);
    copy.length = 0;
    expect(getDecisionLog(state, playerIds[0]!).length).toBeGreaterThan(0);
  });
});
