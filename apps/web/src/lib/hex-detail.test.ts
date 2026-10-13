import type { OpenedHex, TileOption } from "@pejuang/shared";
import { describe, expect, it } from "vitest";
import {
  buildLitDetail,
  buildOpenedDetail,
  REALITY_LOCKED_TEXT,
  resolveHexClick,
} from "./hex-detail";

const lit = (q: number, r: number, over: Partial<TileOption> = {}): TileOption => ({
  hex: { q, r },
  category: "work",
  title: `Rencana ${q},${r}`,
  plan: [{ stat: "wealth", delta: 100_000 }],
  risk: "low",
  riskTags: [{ type: "rankOne", plusPct: 15 }],
  isGold: false,
  ...over,
});

const opened = (over: Partial<OpenedHex> = {}): OpenedHex => ({
  hex: { q: 2, r: -1 },
  category: "health",
  title: "Olahraga",
  plan: [{ stat: "health", delta: 1 }],
  reality: null,
  byPlayerId: "p2",
  step: 3,
  ...over,
});

describe("klik heksa", () => {
  const options = [lit(1, 0), lit(0, 1)];

  it("heksa menyala membuka detail dengan tombol Pilih dan tag risiko", () => {
    const detail = resolveHexClick("1,0", options, [])!;
    expect(detail.title).toBe("Rencana 1,0");
    expect(detail.canChoose).toBe(true);
    expect(detail.chooseLabel).toBe("PILIH HEKSA INI");
    expect(detail.risk).toBe("low");
    expect(detail.riskTags).toEqual(["Beban peringkat 1: peluang zonk +15%"]);
  });

  it("klik heksa menyala lain mengganti isi detail", () => {
    expect(resolveHexClick("1,0", options, [])!.title).not.toBe(
      resolveHexClick("0,1", options, [])!.title,
    );
  });

  it("heksa yang tidak menyala dan tidak terbuka tidak bisa diklik", () => {
    expect(resolveHexClick("3,3", options, [opened()])).toBeNull();
  });

  it("heksa terbuka tanpa tombol Pilih; Realita terkunci sebelum Fase Pembalikan", () => {
    const detail = resolveHexClick("2,-1", [], [opened()])!;
    expect(detail.canChoose).toBe(false);
    expect(detail.reality).toEqual({ state: "locked", text: REALITY_LOCKED_TEXT });
  });

  it("heksa terbuka menampilkan Realita setelah Fase Pembalikan", () => {
    const reality = { outcome: "lucky" as const, text: "Bonus", effects: [], seasonal: false };
    expect(buildOpenedDetail(opened({ reality })).reality).toEqual({ state: "revealed", ...reality });
  });
});

describe("Realita terkunci dan Petak Emas", () => {
  it("heksa menyala biasa menulis 'Terungkap di akhir ronde'", () => {
    expect(buildLitDetail(lit(1, 0)).reality).toEqual({
      state: "locked",
      text: "Terungkap di akhir ronde",
    });
  });

  it("Petak Emas tanpa bagian Realita dan tombol AMBIL PETAK EMAS", () => {
    const gold = buildLitDetail(lit(1, 0, { category: "gold", isGold: true }));
    expect(gold.reality).toEqual({ state: "none" });
    expect(gold.chooseLabel).toBe("AMBIL PETAK EMAS");
    expect(buildOpenedDetail(opened({ category: "gold" })).reality).toEqual({ state: "none" });
  });
});
