/**
 * Token desain Pejuang UMR (sumber: docs/02_DESIGN.md v1.7).
 * Dua lapis: nilai mentah diekspor sebagai konstanta, nama makna dipakai di kode.
 * Uang selalu number Rupiah bulat; Kesehatan/Stres selalu 0-10.
 */

export const RAW_COLORS = {
  yellow500: "#f5c542",
  yellow100: "#fbe6b1",
  green500: "#3fb871",
  green200: "#86da99",
  coral500: "#e0614a",
  coral200: "#f4b7ae",
  coral50: "#fae2dc",
  coral800: "#7c2a19",
  navy700: "#243040",
  navy950: "#0a1422",
  navy800: "#17202f",
  navy750: "#212b39",
  gray600: "#555f6f",
  paper: "#f5d56b",
  paperCard: "#ebc25a",
  ink: "#3b2a12",
  buttonGreen: "#8bd450",
  buttonGreenInk: "#2d5a12",
  buttonBlue: "#7fb0f5",
  buttonBlueInk: "#1f3f73",
  buttonOrange: "#f5a623",
  stampRed: "#c0392b",
} as const;

export const SEMANTIC_TOKENS = {
  indicatorWealth: RAW_COLORS.yellow500,
  indicatorHealth: RAW_COLORS.green500,
  indicatorStress: RAW_COLORS.coral500,
  dangerSoft: RAW_COLORS.coral200,
  surface: RAW_COLORS.navy950,
  surfaceRaised: RAW_COLORS.navy800,
  surfaceHigher: RAW_COLORS.navy750,
  border: RAW_COLORS.gray600,
  textPrimary: "#d9e3f7",
  textSecondary: "#cfc5b0",
  textMuted: "#85837c",
  paper: RAW_COLORS.paper,
  paperCard: RAW_COLORS.paperCard,
  ink: RAW_COLORS.ink,
  actionGreen: RAW_COLORS.buttonGreen,
  actionGreenInk: RAW_COLORS.buttonGreenInk,
  actionBlue: RAW_COLORS.buttonBlue,
  actionBlueInk: RAW_COLORS.buttonBlueInk,
  actionOrange: RAW_COLORS.buttonOrange,
  stamp: RAW_COLORS.stampRed,
} as const;

export const RADIUS = { sm: 8, md: 16, lg: 24, full: 9999 } as const;

export const SPACING = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Skor 0-10 (Kesehatan/Stres) menjadi persen bar 0-100. */
export function scoreToPercent(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score * 10)));
}

/** Batas aman hutang sesuai GDD: Rp25.000.000. */
export const DEBT_LIMIT = 25_000_000;
