import type { Category, Risk } from "@pejuang/shared";
import { TILE_DETAILS } from "@/data/game";

export type HexTileState = "closed" | "lit" | "open" | "dead";

export type HexTileVisual = {
  state: HexTileState;
  category: Category | null;
  risk: Risk | null;
  isGold: boolean;
  isActive: boolean;
  label: string;
};

const STATE_CLASSES: Record<HexTileState, string> = {
  closed: "border-garis bg-navy-700 text-teks-redup",
  lit: "border-utama bg-utama text-di-utama shadow-[0_0_12px_rgba(245,197,66,0.55)]",
  open: "border-garis bg-kartu-tinggi text-teks-utama",
  dead: "border-garis bg-kartu text-teks-redup opacity-70",
};

const RISK_LINES: Record<NonNullable<Risk>, string> = {
  low: "▁",
  medium: "▁▃",
  high: "▁▃▅",
};

/**
 * Heksa 4 state (DOM, bukan WebGL): tertutup, menyala, terbuka, mati.
 * Warna selalu disertai ikon/bentuk (aksesibilitas).
 */
export default function HexTile({ visual }: { visual: HexTileVisual }) {
  const category = visual.category ? TILE_DETAILS[visual.category] : null;
  return (
    <div
      role="img"
      aria-label={visual.label}
      className={`grid aspect-square w-full place-items-center rounded-md border-2 transition ${STATE_CLASSES[visual.state]} ${visual.isActive ? "ring-2 ring-utama" : ""}`}
    >
      {visual.state === "dead" ? (
        <span aria-hidden="true" className="text-title">✕</span>
      ) : category ? (
        <span className="grid place-items-center gap-0.5">
          <span aria-hidden="true" className="text-lg leading-none">{category.icon}</span>
          {visual.isGold ? (
            <span aria-hidden="true" className="text-[10px] leading-none">✦</span>
          ) : null}
          {visual.risk ? (
            <span aria-hidden="true" className="text-[10px] leading-none" title={`Risiko ${visual.risk}`}>
              {RISK_LINES[visual.risk]}
            </span>
          ) : null}
        </span>
      ) : (
        <span aria-hidden="true" className="text-lg leading-none">?</span>
      )}
    </div>
  );
}

export { RISK_LINES };
