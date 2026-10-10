import { describe, expect, it } from "vitest";
import { formatRupiah, formatRupiahShort } from "./rupiah";

describe("formatRupiah", () => {
  it("memformat Rupiah penuh dengan pemisah ribuan", () => {
    expect(formatRupiah(5_730_000)).toBe("Rp5.730.000");
    expect(formatRupiah(25_000_000)).toBe("Rp25.000.000");
  });

  it("menempatkan tanda minus sebelum Rp", () => {
    expect(formatRupiah(-1_500_000)).toBe("-Rp1.500.000");
  });

  it("menangani nol", () => {
    expect(formatRupiah(0)).toBe("Rp0");
  });
});

describe("formatRupiahShort", () => {
  it("meringkas nilai dalam jutaan", () => {
    expect(formatRupiahShort(5_700_000)).toBe("Rp5,7jt");
    expect(formatRupiahShort(25_000_000)).toBe("Rp25jt");
  });

  it("meringkas nilai dalam ribuan", () => {
    expect(formatRupiahShort(750_000)).toBe("Rp750rb");
  });

  it("menempatkan tanda minus sebelum Rp", () => {
    expect(formatRupiahShort(-1_500_000)).toBe("-Rp1,5jt");
  });

  it("menangani nol", () => {
    expect(formatRupiahShort(0)).toBe("Rp0");
  });
});
