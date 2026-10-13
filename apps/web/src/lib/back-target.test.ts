import { describe, expect, it } from "vitest";
import { consumeInternalNavigation, decideBackTarget, markInternalNavigation } from "./back-target";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe("decideBackTarget", () => {
  it("memakai riwayat jika datang dari dalam aplikasi", () => {
    expect(decideBackTarget({ cameFromApp: true, historyLength: 3 })).toBe("history");
  });
  it("ke Home jika dibuka langsung", () => {
    expect(decideBackTarget({ cameFromApp: false, historyLength: 5 })).toBe("home");
  });
  it("ke Home jika tidak ada riwayat sebelumnya", () => {
    expect(decideBackTarget({ cameFromApp: true, historyLength: 1 })).toBe("home");
  });
});

describe("penanda navigasi internal", () => {
  it("sekali pakai", () => {
    const s = memoryStorage();
    expect(consumeInternalNavigation(s)).toBe(false);
    markInternalNavigation(s);
    expect(consumeInternalNavigation(s)).toBe(true);
    expect(consumeInternalNavigation(s)).toBe(false);
  });
  it("aman tanpa penyimpanan atau saat penyimpanan error", () => {
    expect(() => markInternalNavigation(null)).not.toThrow();
    expect(consumeInternalNavigation(null)).toBe(false);
    const broken = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); }, removeItem: () => { throw new Error("x"); } };
    expect(() => markInternalNavigation(broken)).not.toThrow();
    expect(consumeInternalNavigation(broken)).toBe(false);
  });
});
