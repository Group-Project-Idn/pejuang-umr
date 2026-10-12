import { describe, expect, it } from "vitest";
import type { Reflection } from "@pejuang/shared";
import { FakeReflectionProvider } from "./fake-provider";
import { ReflectionService } from "./service";
import type { ReflectionInput } from "./types";

const input: ReflectionInput = {
  playerCount: 2,
  log: [],
  finalStatus: { wealth: 1, debt: 0, health: 5, stress: 5 },
  score: 50,
  points: { finance: 50, health: 50, calm: 50 },
  rank: 1,
  eliminated: null,
};

const fallback: Reflection = {
  source: "rules",
  summary: "Cadangan aturan.",
  insights: [{ title: "Cadangan", body: "Isi cadangan." }],
};

function service(provider: FakeReflectionProvider | null, extra: { timeoutMs?: number; maxConcurrent?: number } = {}) {
  const logs: string[] = [];
  return { logs, svc: new ReflectionService({ provider, log: (m) => logs.push(m), ...extra }) };
}

describe("ReflectionService", () => {
  it("tanpa provider: cadangan aturan", async () => {
    const { svc } = service(null);
    expect(svc.hasProvider).toBe(false);
    expect(await svc.create(input, fallback)).toBe(fallback);
  });

  it("provider berhasil: source ai", async () => {
    const provider = new FakeReflectionProvider("success");
    const { svc, logs } = service(provider);
    const result = await svc.create(input, fallback);
    expect(result.source).toBe("ai");
    expect(result.insights[0]!.reference).toContain("Morgan Housel");
    expect(logs).toEqual([]);
    expect(provider.calls).toEqual([input]);
  });

  it("source dipaksa ai walau provider menulis rules", async () => {
    const provider: FakeReflectionProvider = new FakeReflectionProvider("success");
    provider.generate = async () => ({ source: "rules", summary: "x", insights: [{ title: "t", body: "b" }] });
    const result = await service(provider).svc.create(input, fallback);
    expect(result.source).toBe("ai");
  });

  it("gagal, tidak valid, dan lambat jatuh ke cadangan; log tanpa data pemain", async () => {
    for (const mode of ["fail", "invalid", "slow"] as const) {
      const provider = new FakeReflectionProvider(mode, 5_000);
      const { svc, logs } = service(provider, { timeoutMs: 30 });
      const started = Date.now();
      expect(await svc.create({ ...input, score: 12.345678 }, fallback)).toBe(fallback);
      expect(Date.now() - started).toBeLessThan(2_000);
      expect(logs).toHaveLength(1);
      expect(logs[0]).toContain("[reflection]");
      expect(logs[0]).not.toContain("12.345678");
    }
  });

  it("provider lambat dibatalkan lewat AbortSignal saat melewati batas waktu", async () => {
    const provider = new FakeReflectionProvider("slow", 5_000);
    let aborted = false;
    const original = provider.generate.bind(provider);
    provider.generate = (i, signal) => {
      signal.addEventListener("abort", () => {
        aborted = true;
      });
      return original(i, signal);
    };
    await service(provider, { timeoutMs: 20 }).svc.create(input, fallback);
    expect(aborted).toBe(true);
  });

  it("membatasi panggilan provider bersamaan (antre) tanpa kehilangan hasil", async () => {
    const provider = new FakeReflectionProvider("slow", 20);
    const { svc } = service(provider, { maxConcurrent: 2, timeoutMs: 5_000 });
    const results = await Promise.all(Array.from({ length: 6 }, () => svc.create(input, fallback)));
    expect(results.every((r) => r.source === "ai")).toBe(true);
    expect(provider.maxInFlight).toBeLessThanOrEqual(2);
    expect(provider.calls).toHaveLength(6);
  });
});
