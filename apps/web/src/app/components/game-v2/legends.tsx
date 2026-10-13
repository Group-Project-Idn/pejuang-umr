import type { Category, Risk } from "@pejuang/shared";
import { TILE_DETAILS } from "@/data/game";
import CategoryIcon from "../game/CategoryIcon";

const RISK_LABEL: Record<Risk, string> = {
  low: "Risiko Rendah",
  medium: "Risiko Sedang",
  high: "Risiko Tinggi",
};
const RISK_BARS: Record<Risk, number> = { low: 1, medium: 2, high: 3 };

/** Meter risiko 3 batang (1/2/3 terisi) + segitiga peringatan untuk Sedang/Tinggi: bentuk, bukan hanya warna. */
export function RiskIndicator({ risk }: { risk: Risk }) {
  const filled = RISK_BARS[risk];
  return (
    <div className={`risk-meter risk-meter-${risk}`} role="img" aria-label={RISK_LABEL[risk]}>
      <span className="risk-bars" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <i key={n} className={n <= filled ? "on" : ""} style={{ height: 8 + n * 5 }} />
        ))}
      </span>
      <strong>{RISK_LABEL[risk]}</strong>
      {risk !== "low" ? <span className="risk-warn" aria-hidden="true">⚠</span> : null}
    </div>
  );
}

/** Legenda kategori + risiko: ikon selalu menyertai warna. */
export default function Legends() {
  return (
    <ul aria-label="Legenda petak" className="grid grid-cols-2 gap-2 text-body-sm text-teks-sekunder">
      {Object.entries(TILE_DETAILS).map(([category, detail]) => (
        <li key={category} className="flex items-center gap-2">
          <span aria-hidden="true" className="text-body text-teks-utama"><CategoryIcon category={category as Category} size={20} /></span>
          <span>{detail.label}</span>
        </li>
      ))}
      <li className="flex items-center gap-2">
        <span aria-hidden="true">◔</span>
        <span>Risiko garis, bukan warna</span>
      </li>
    </ul>
  );
}
