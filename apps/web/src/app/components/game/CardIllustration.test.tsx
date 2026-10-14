import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Category } from "@pejuang/shared";
import CardIllustration from "./CardIllustration";
import HexDetailSheet from "./HexDetailSheet";
import { buildLitDetail, buildOpenedDetail } from "@/lib/hex-detail";

describe("ilustrasi kartu petak", () => {
  function expectIllustrationBetweenHeadings(markup: string, title: string, category: Category) {
    const heading = markup.match(/<h2\b[^>]*class="[^"]*ui-popup-title[^"]*"[^>]*>[^<]*<\/h2>/)?.[0];
    expect(heading).toBeDefined();
    expect(heading).toContain(`>${title}</h2>`);
    const titleAt = markup.indexOf(heading!);
    const illustrationAt = markup.indexOf(`card-illustration-${category}`);
    const planAt = markup.indexOf(">RENCANA</h3>");
    expect(titleAt).toBeGreaterThanOrEqual(0);
    expect(illustrationAt).toBeGreaterThanOrEqual(0);
    expect(planAt).toBeGreaterThanOrEqual(0);
    expect(titleAt).toBeLessThan(illustrationAt);
    expect(illustrationAt).toBeLessThan(planAt);
  }

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
    expectIllustrationBetweenHeadings(markup, "Main Board Game Cafe", "social");
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

  it("petak biasa terbuka menampilkan Realita terungkap tanpa tombol Pilih", () => {
    const detail = buildOpenedDetail({
      hex: { q: 3, r: -1 }, category: "work", title: "Lembur Dikejar Deadline",
      plan: [{ stat: "wealth", delta: 1_500_000 }],
      reality: { outcome: "zonk", text: "Rapat molor hingga pagi", effects: [{ stat: "stress", delta: 2 }], seasonal: false },
      byPlayerId: "p1", step: 3,
    });
    const markup = renderToStaticMarkup(<HexDetailSheet detail={detail} pending={false} onChoose={() => {}} onClose={() => {}} />);
    expectIllustrationBetweenHeadings(markup, detail.title, "work");
    expect(markup).toContain("Rapat molor hingga pagi");
    expect(markup).toContain("REALITA");
    expect(markup).not.toContain("PILIH HEKSA INI");
    expect(markup).toContain("Tutup");
  });
});