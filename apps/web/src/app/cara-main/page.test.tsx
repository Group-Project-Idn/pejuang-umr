import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import CaraMainPage, { metadata } from "./page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ back: () => {}, push: () => {} }) }));

describe("panduan Cara Main", () => {
  const markup = renderToStaticMarkup(<CaraMainPage />);

  it("memakai route yang sudah ada, daftar isi dan delapan bagian dengan tautan valid", () => {
    expect(metadata.title).toContain("Cara Main");
    expect(markup).toContain('aria-label="Isi panduan"');
    const ids = ["mulai", "layar", "giliran", "status", "ajakan", "khusus", "hasil", "koneksi"];
    for (const id of ids) {
      expect(markup).toContain(`href="#${id}"`);
      expect(markup).toContain(`id="${id}"`);
      expect(markup).toContain(`aria-labelledby="${id}-title"`);
    }
    expect(markup.match(/← Kembali/g)).toHaveLength(2);
    expect(markup).toContain("<figcaption");
    expect(markup).not.toMatch(/<img\b|https?:\/\/|<canvas\b/);
  });

  it("menjelaskan aturan MVP terbaru tanpa menampilkan aturan Solo atau skor dalam Rupiah", () => {
    for (const rule of [
      "2–4 orang", "24 langkah", "30 detik hanyalah perkiraan", "minimal 2 pemain",
      "PILIH HEKSA INI", "dikali 2", "Rp5.730.000", "Rp5.200.000",
      "Bayar Hutang Rp0", "Tulus + Tolak", "Komisi + Ikut", "Mulai Bulan 3",
      "Langkah 5, 9, 13, 17, dan 21", "lebih dari Rp25.000.000",
      "Kesehatan ≤3", "poin 0–100, bukan Rupiah", "Permainan tidak berhenti",
    ]) {
      expect(markup.toLowerCase()).toContain(rule.toLowerCase());
    }
    expect(markup).toContain("Mode Singel dan Ajang Flexing belum tersedia");
    expect(markup).not.toContain("Modifier");
  });

  it("menjelaskan gambar dengan caption dan label, tanpa menampilkan rahasia permainan", () => {
    expect(markup).toContain("Contoh skematis");
    expect(markup).toContain("Tertutup");
    expect(markup).toContain("Menyala");
    expect(markup).toContain("Terbuka");
    expect(markup).toContain("Risiko Sedang");
    expect(markup).toContain("Contoh status awal");
    expect(markup).toContain("Contoh kalender");
    expect(markup).toContain("Contoh alur Ajakan");
    expect(markup).not.toMatch(/UMR-\d{4}|token sesi:|playerId:/);
  });

  it("memakai tata letak satu kolom pada layar sempit dan grid pada layar lebih lebar", () => {
    expect(markup).toContain("min-w-0");
    expect(markup).toContain("sm:grid-cols-2");
    expect(markup).toContain("sm:grid-cols-3");
    expect(markup).toContain("lg:grid-cols-4");
    expect(markup).toContain("min-h-11");
  });
});