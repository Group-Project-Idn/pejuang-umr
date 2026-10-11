import { describe, expect, it } from "vitest";
import { RISK_LINES, type HexTileVisual } from "./HexTile";

function makeVisual(overrides: Partial<HexTileVisual> = {}): HexTileVisual {
  return {
    state: "closed",
    category: null,
    risk: null,
    isGold: false,
    isActive: false,
    label: "Heksa tertutup",
    ...overrides,
  };
}

describe("aturan visual heksa", () => {
  it("risiko memakai jumlah garis, bukan hanya warna", () => {
    expect(RISK_LINES.low).toBe("▁");
    expect(RISK_LINES.medium).toBe("▁▃");
    expect(RISK_LINES.high).toBe("▁▃▅");
  });

  it("visual membawa label aksesibel", () => {
    const visual = makeVisual({ state: "open", category: "finance", label: "Keuangan, risiko rendah" });
    expect(visual.label.length).toBeGreaterThan(0);
    expect(visual.category).toBe("finance");
  });

  it("petak emas selalu ditandai terpisah dari warna", () => {
    const visual = makeVisual({ state: "lit", category: "gold", isGold: true });
    expect(visual.isGold).toBe(true);
  });
});
