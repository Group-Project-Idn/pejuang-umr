import type { Category, HexCoord, PawnId } from "@pejuang/shared";

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

export function getBoardWorldBounds(board: readonly HexCoord[]) {
  if (board.length === 0) {
    return { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  }
  return board.reduce(
    (bounds, hex) => {
      const { x, z } = hexToWorld(hex.q, hex.r);
      return {
        minX: Math.min(bounds.minX, x),
        maxX: Math.max(bounds.maxX, x),
        minZ: Math.min(bounds.minZ, z),
        maxZ: Math.max(bounds.maxZ, z),
      };
    },
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minZ: Number.POSITIVE_INFINITY,
      maxZ: Number.NEGATIVE_INFINITY,
    },
  );
}

export function getBoardDeskSize(board: readonly HexCoord[], margin = 1.2) {
  const bounds = getBoardWorldBounds(board);
  const tileDiameter = HEX_TILE_RADIUS * 2;
  return {
    width: bounds.maxX - bounds.minX + tileDiameter + margin * 2,
    depth: bounds.maxZ - bounds.minZ + tileDiameter + margin * 2,
  };
}

