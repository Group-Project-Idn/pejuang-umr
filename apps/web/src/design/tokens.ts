/**
 * Peta token desain Pejuang UMR (DESIGN.md v1.7).
 * Dua lapis: RAW_COLORS (mentah) -> SEMANTIC_COLORS (makna).
 * Kode komponen hanya memakai nama makna.
 */
export const RAW_COLORS = {
  "kuning-500": "#f5c542",
  "kuning-100": "#fbe6b1",
  "kuning-tinta": "#3c2f09",
  "hijau-500": "#3fb871",
  "hijau-100": "#86da99",
  "hijau-tinta": "#092010",
  "koral-500": "#e0614a",
  "koral-100": "#f4b7ae",
  "koral-50": "#fae2dc",
  "koral-900": "#7c2a19",
  "koral-tinta": "#390803",
  "navy-700": "#243040",
  "navy-800": "#17202f",
  "navy-850": "#212b39",
  "navy-900": "#0a1422",
  "kertas-400": "#f5d56b",
  "kertas-500": "#ebc25a",
  tinta: "#3b2a12",
  "hijau-tombol": "#8bd450",
  "hijau-tombol-tinta": "#2d5a12",
  "biru-tombol": "#7fb0f5",
  "biru-tombol-tinta": "#1f3f73",
  "oranye-tombol": "#f5a623",
  stempel: "#c0392b",
  garis: "#555f6f",
  "teks-utama": "#d9e3f7",
  "teks-sekunder": "#cfc5b0",
  "teks-redup": "#85837c",
  kontras: "#d9e3f7",
  "di-kontras": "#131c2a",
} as const;

export type RawColorName = keyof typeof RAW_COLORS;

export const SEMANTIC_COLORS = {
  permukaan: "navy-900",
  kartu: "navy-800",
  "kartu-tinggi": "navy-850",
  garis: "garis",
  "teks-utama": "teks-utama",
  "teks-sekunder": "teks-sekunder",
  "teks-redup": "teks-redup",
  utama: "kuning-500",
  "di-utama": "kuning-tinta",
  "utama-lembut": "kuning-100",
  kontras: "kontras",
  "di-kontras": "di-kontras",
  sehat: "hijau-500",
  "di-sehat": "hijau-tinta",
  "sehat-lembut": "hijau-100",
  bahaya: "koral-500",
  "di-bahaya": "koral-tinta",
  "bahaya-lembut": "koral-100",
  "bahaya-pucat": "koral-50",
  "bahaya-tua": "koral-900",
  "indikator-kekayaan": "kuning-100",
  "indikator-kesehatan": "hijau-100",
  "indikator-stres": "koral-50",
  kertas: "kertas-400",
  "kertas-kartu": "kertas-500",
} satisfies Record<string, RawColorName>;

export type SemanticColorName = keyof typeof SEMANTIC_COLORS;

export function resolveSemanticColor(name: SemanticColorName): string {
  return RAW_COLORS[SEMANTIC_COLORS[name]];
}

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

export const TYPE_SCALE = {
  display: { size: 48, weight: 800, lineHeight: 1.1 },
  headline: { size: 28, weight: 700, lineHeight: 1.2 },
  title: { size: 18, weight: 600, lineHeight: 1.3 },
  body: { size: 16, weight: 400, lineHeight: 1.5 },
  "body-sm": { size: 14, weight: 400, lineHeight: 1.5 },
  label: { size: 13, weight: 500, lineHeight: 1.3 },
} as const;

/** Ubah skor 0-10 menjadi persen 0-100 untuk progress bar. */
export function scoreToPercent(value: number): number {
  const clamped = Math.min(10, Math.max(0, value));
  return clamped * 10;
}
