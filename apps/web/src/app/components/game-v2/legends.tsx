import type { Category, Risk } from "@pejuang/shared";
import { TILE_DETAILS } from "@/data/game";
import CategoryIcon from "../game/CategoryIcon";
import Chip from "../ui/Chip";

const RISK_TEXT: Record<Risk, string> = {
  low: "Rendah ▁",
  medium: "Sedang ▁▃",
  high: "Tinggi ▁▃▅",
};

export function RiskIndicator({ risk }: { risk: Risk }) {
  return (
    <Chip aria-label={`Risiko ${RISK_TEXT[risk]}`}>
      <span aria-hidden="true">◔</span>
      <span>{RISK_TEXT[risk]}</span>
    </Chip>
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
