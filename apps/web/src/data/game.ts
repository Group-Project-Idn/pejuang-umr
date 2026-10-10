import type { Category, PawnId } from "@pejuang/shared";

export const HEX_TILE_RADIUS = 0.88;

export const TILE_DETAILS: Record<
  Category,
  { label: string; icon: string; color: string }
> = {
  work: { label: "Kerja", icon: "▣", color: "#f2e8cf" },
  social: { label: "Sosial", icon: "●●●", color: "#f7efd9" },
  health: { label: "Kesehatan", icon: "♥", color: "#f6e7d3" },
  finance: { label: "Keuangan", icon: "●", color: "#eed9a6" },
  gold: { label: "Petak Emas", icon: "✦", color: "#f4c64f" },
};

export const PAWN_DETAILS: Record<
  PawnId,
  { sprite: string; accent: string }
> = {
  "cream-circle": {
    sprite: "/characters/michael.png",
    accent: "#72bf69",
  },
  "iceblue-square": {
    sprite: "/characters/raka.png",
    accent: "#62a4ce",
  },
  "mint-triangle": {
    sprite: "/characters/sinta.png",
    accent: "#9d70c5",
  },
  "salmon-diamond": {
    sprite: "/characters/icha.png",
    accent: "#df786f",
  },
};

export function hexToWorld(q: number, r: number) {
  return {
    x: HEX_TILE_RADIUS * 1.5 * q,
    z: HEX_TILE_RADIUS * Math.sqrt(3) * (r + q / 2),
  };
}

export function formatRupiah(value: number) {
  return `Rp${new Intl.NumberFormat("id-ID").format(value)}`;
}