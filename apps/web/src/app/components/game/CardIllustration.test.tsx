import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Category } from "@pejuang/shared";
import CardIllustration from "./CardIllustration";
import HexDetailSheet from "./HexDetailSheet";
import { buildLitDetail, buildOpenedDetail } from "@/lib/hex-detail";

describe("ilustrasi kartu petak", () => {
  it.each<Category>(["work", "social", "health", "finance", "gold"])(
    "kategori %s memakai SVG dekoratif tanpa aset eksternal",
    (category) => {
      const markup = renderToStaticMarkup(<CardIllustration category={category} />);
      expect(markup).toContain(`card-illustration-${category}`);
      expect(markup).toContain('aria-hidden="true"');
      expect(markup).toContain('<svg');
      expect(markup).toContain('viewBox="0 0 200 92"');
      expect(markup).not.toMatch(/<image\b|<img\b|https?:\/\//);
    },
  );

  it("menempatkan ilustrasi di antara judul dan Rencana untuk petak menyala", () => {
    const detail = buildLitDetail({
      hex: { q: 1, r: 0 }, category: "social", title: "Main Board Game Cafe",
      plan: [{ stat: "stress", delta: -1 }], risk: "low", riskTags: [], isGold: false,
    });
    const markup = renderToStaticMarkup(<HexDetailSheet detail={detail} pending={false} onChoose={() => {}} onClose={() => {}} />);
    expect(markup.indexOf("Main Board Game Cafe")).toBeLessThan(markup.indexOf("card-illustration-social"));
    expect(markup.indexOf("card-illustration-social")).toBeLessThan(markup.indexOf("RENCANA"));
    expect(markup).toContain("Terungkap di akhir ronde");
    expect(markup).toContain("PILIH HEKSA INI");
  });

  it("petak terbuka dan Emas tetap memakai kategori tanpa mengubah Realita", () => {
    const detail = buildOpenedDetail({
      hex: { q: 2, r: 0 }, category: "gold", title: "Bonus Kinerja 2x Gaji",
      plan: [{ stat: "wealth", delta: 10_000_000 }], reality: null, byPlayerId: "p1", step: 2,
    });
    const markup = renderToStaticMarkup(<HexDetailSheet detail={detail} pending={false} onChoose={() => {}} onClose={() => {}} />);
    expect(markup).toContain("card-illustration-gold");
    expect(markup).toContain("Tidak ada Realita");
    expect(markup).not.toContain("AMBIL PETAK EMAS");
  });
});