import type { Category, Risk } from "@pejuang/shared";
import CategoryIcon from "../game/CategoryIcon";

export type HexTileState = "closed" | "lit" | "open" | "dead";

export type HexTileVisual = {
  state: HexTileState;
  category: Category | null;
  risk: Risk | null;
  isGold: boolean;
  isActive: boolean;
  label: string;
};

export const RISK_LINES = {
  low: "▁",
  medium: "▁▃",
  high: "▁▃▅",
} as const;

/** Heksa 2D mobile-first: 4 state + ikon kategori + garis risiko (bukan warna saja). */
export default function HexTile({ visual }: { visual: HexTileVisual }) {
  return (
    <button
      type="button"
      aria-label={visual.label}
      data-state={visual.state}
      data-gold={visual.isGold ? "true" : undefined}
      data-active={visual.isActive ? "true" : undefined}
      className="grid size-16 place-items-center border border-garis bg-kartu text-teks-utama transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5c542] [clip-path:polygon(25%_0,75%_0,100%_50%,75%_100%,25%_100%,0_50%)]"
    >
      <span className="grid place-items-center gap-0.5">
        <span aria-hidden="true" className="text-body">
          {visual.state === "closed" || !visual.category ? (
            visual.state === "closed" ? "?" : "·"
          ) : (
            <CategoryIcon category={visual.category} size={20} />
          )}
        </span>
        {visual.risk ? (
          <small aria-hidden="true" className="text-label tabular-nums">
            {RISK_LINES[visual.risk]}
          </small>
        ) : null}
        {visual.isGold ? (
          <small aria-hidden="true" className="text-label text-indikator-kekayaan">✦</small>
        ) : null}
      </span>
    </button>
  );
}
