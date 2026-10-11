import type { Category, Risk } from "@pejuang/shared";
import { TILE_DETAILS } from "@/data/game";
import { RISK_LINES } from "./HexTile";

const SEASON_META = {
  rainy: { icon: "☂", label: "Musim hujan" },
  dry: { icon: "☀", label: "Musim kemarau" },
  transition: { icon: "◐", label: "Pancaroba" },
} as const;

/** Kamus Petak: legenda ikon kategori sesuai guide. */
export function TileLegend() {
  const entries = (Object.keys(TILE_DETAILS) as Category[]).map((key) => ({
    key,
    ...TILE_DETAILS[key],
  }));
  return (
    <section aria-label="Kamus petak" className="grid gap-1 rounded-md border border-garis bg-kartu p-3">
      <h3 className="text-label font-semibold text-teks-utama">Kamus petak</h3>
      <ul className="grid gap-1">
        {entries.map((entry) => (
          <li key={entry.key} className="flex items-center gap-2 text-body-sm text-teks-sekunder">
            <span aria-hidden="true" className="w-8 text-center text-teks-utama">{entry.icon}</span>
            <span>{entry.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Indikator risiko: jumlah garis/bentuk, bukan hanya warna. */
export function RiskIndicator({ risk }: { risk: Risk | null }) {
  if (!risk) return <span className="text-body-sm text-teks-redup">Risiko belum diketahui</span>;
  return (
    <span className="inline-flex items-center gap-1 text-body-sm text-teks-utama" role="img" aria-label={`Risiko ${risk}`}>
      <span aria-hidden="true">{RISK_LINES[risk]}</span>
      <span className="capitalize">{risk === "low" ? "Rendah" : risk === "medium" ? "Sedang" : "Tinggi"}</span>
    </span>
  );
}

/** Lencana musim memakai nada palet yang sama (tanpa warna baru). */
export function SeasonBadge({ season }: { season: keyof typeof SEASON_META }) {
  const meta = SEASON_META[season];
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-kartu-tinggi px-2 py-1 text-label text-teks-utama">
      <span aria-hidden="true">{meta.icon}</span>
      <span>{meta.label}</span>
    </span>
  );
}
