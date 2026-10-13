import type {
  Category,
  Effect,
  OpenedHex,
  Risk,
  RiskTag,
  TileOption,
} from "@pejuang/shared";

export const REALITY_LOCKED_TEXT = "Terungkap di akhir ronde";

export type HexRealityView =
  | { state: "none" }
  | { state: "locked"; text: string }
  | {
      state: "revealed";
      outcome: "zonk" | "safe" | "lucky";
      text: string;
      effects: Effect[];
    };

export type HexDetailView = {
  key: string;
  hex: { q: number; r: number };
  source: "lit" | "opened";
  title: string;
  category: Category;
  isGold: boolean;
  plan: Effect[];
  risk: Risk | null;
  riskTags: string[];
  reality: HexRealityView;
  /** Hanya heksa menyala milik pemain aktif yang bisa dipilih. */
  canChoose: boolean;
  chooseLabel: string;
};

export function riskTagLabel(tag: RiskTag): string {
  switch (tag.type) {
    case "rankOne":
      return `Beban peringkat 1: peluang zonk +${tag.plusPct}%`;
    case "season":
      return `Rawan musim: peluang zonk +${tag.plusPct}%`;
    case "immune":
      return "Kebal musim: Kesehatan ≥ 8";
  }
}

export function buildLitDetail(option: TileOption): HexDetailView {
  return {
    key: `${option.hex.q},${option.hex.r}`,
    hex: option.hex,
    source: "lit",
    title: option.title,
    category: option.isGold ? "gold" : option.category,
    isGold: option.isGold,
    plan: option.plan,
    risk: option.risk,
    riskTags: option.riskTags.map(riskTagLabel),
    reality: option.isGold
      ? { state: "none" }
      : { state: "locked", text: REALITY_LOCKED_TEXT },
    canChoose: true,
    chooseLabel: option.isGold ? "AMBIL PETAK EMAS" : "PILIH HEKSA INI",
  };
}

/** Heksa terbuka: Realita muncul setelah Fase Pembalikan (reality terisi). */
export function buildOpenedDetail(opened: OpenedHex): HexDetailView {
  const isGold = opened.category === "gold";
  return {
    key: `${opened.hex.q},${opened.hex.r}`,
    hex: opened.hex,
    source: "opened",
    title: opened.title,
    category: opened.category,
    isGold,
    plan: opened.plan,
    risk: null,
    riskTags: [],
    reality: isGold
      ? { state: "none" }
      : opened.reality
        ? { state: "revealed", ...opened.reality }
        : { state: "locked", text: REALITY_LOCKED_TEXT },
    canChoose: false,
    chooseLabel: "",
  };
}

/**
 * Hanya heksa menyala atau terbuka yang bisa diklik; heksa lain mengembalikan null.
 * Heksa menyala didahulukan karena bisa jadi sudah pernah terbuka oleh pemain lain.
 */
export function resolveHexClick(
  key: string,
  lit: readonly TileOption[],
  opened: readonly OpenedHex[],
): HexDetailView | null {
  const litOption = lit.find((o) => `${o.hex.q},${o.hex.r}` === key);
  if (litOption) return buildLitDetail(litOption);
  const openedHex = opened.find((o) => `${o.hex.q},${o.hex.r}` === key);
  return openedHex ? buildOpenedDetail(openedHex) : null;
}
