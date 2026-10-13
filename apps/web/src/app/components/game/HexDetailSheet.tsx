import { formatRupiah } from "@pejuang/shared";
import type { Effect } from "@pejuang/shared";
import { TILE_DETAILS } from "@/data/game";
import type { HexDetailView } from "@/lib/hex-detail";
import { OUTCOME_LABEL } from "@/lib/reveal";
import Button from "../ui/Button";
import SidePanel from "../ui/SidePanel";
import CategoryIcon from "./HexCategoryIcon";
import { RiskIndicator } from "./legends";

const STAT_LABEL: Record<Effect["stat"], string> = {
  wealth: "Kekayaan",
  debt: "Hutang",
  health: "Kesehatan",
  stress: "Level Stress",
};

/** Warna mengikuti arti: kuning = Kekayaan, koral = Hutang dan Level Stress, hijau = Kesehatan. */
const STAT_TONE: Record<Effect["stat"], string> = {
  wealth: "wealth",
  debt: "coral",
  stress: "coral",
  health: "health",
};
const STAT_ICON: Record<Effect["stat"], string> = {
  wealth: "●",
  debt: "▼",
  health: "♥",
  stress: "⚡",
};

function effectValue(effect: Effect): string {
  const value = effect.stat === "wealth" || effect.stat === "debt"
    ? formatRupiah(effect.delta)
    : String(Math.abs(effect.delta));
  return `${effect.delta > 0 ? "+" : effect.delta < 0 ? "−" : ""}${value.replace("-", "")}`;
}

export function EffectList({ effects }: { effects: Effect[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {effects.map((effect, index) => (
        <li key={`${effect.stat}-${index}`} className={`hex-effect hex-effect-${STAT_TONE[effect.stat]}`}>
          <span aria-hidden="true">{STAT_ICON[effect.stat]}</span>
          {STAT_LABEL[effect.stat]} {effectValue(effect)}
        </li>
      ))}
    </ul>
  );
}

export type HexDetailSheetProps = {
  detail: HexDetailView | null;
  pending: boolean;
  onChoose: (hex: HexDetailView["hex"]) => void;
  onClose: () => void;
};

/** Kartu map non-modal Detail Heksa: satu heksa per popup; klik heksa menyala lain mengganti isi. */
export default function HexDetailSheet({ detail, pending, onChoose, onClose }: HexDetailSheetProps) {
  const lit = detail?.source === "lit";
  return (
    <SidePanel
      open={detail !== null}
      title={detail?.title ?? "Detail Heksa"}
      onClose={onClose}
      className={detail?.isGold ? "hex-card-gold" : ""}
      header={
        detail ? (
          <>
            {lit ? (
              <>
                <p className="hex-note"><span aria-hidden="true">🔒</span> Hanya kamu yang bisa melihat ini</p>
                <p className="hex-hint">Klik heksa menyala lain untuk ganti pilihan</p>
              </>
            ) : null}
            <span className="hex-category-chip">
              <CategoryIcon category={detail.category} />
              {TILE_DETAILS[detail.category].label}
            </span>
          </>
        ) : null
      }
    >
      {detail ? (
        <>
          <section className="grid gap-2">
            <h3 className="hex-section">RENCANA</h3>
            <EffectList effects={detail.plan} />
          </section>
          {detail.risk ? (
            <section className="grid gap-2">
              <RiskIndicator risk={detail.risk} />
              {detail.riskTags.length > 0 ? (
                <ul aria-label="Tag risiko" className="flex flex-wrap gap-2">
                  {detail.riskTags.map((tag) => (
                    <li key={tag} className="hex-tag">{tag}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
          {detail.reality.state === "none" ? (
            <p className="hex-gold-note"><span aria-hidden="true">✦</span> Tidak ada Realita, langsung untung.</p>
          ) : (
            <section className="grid gap-2">
              <h3 className="hex-section">REALITA</h3>
              {detail.reality.state === "locked" ? (
                <p className="hex-locked">
                  <span aria-hidden="true" className="hex-locked-icon">?</span>
                  {detail.reality.text}
                </p>
              ) : (
                <div className="hex-reveal">
                  <span className={`hex-stamp hex-stamp-${detail.reality.outcome}`}>
                    {OUTCOME_LABEL[detail.reality.outcome]}
                  </span>
                  <p>{detail.reality.text}</p>
                  <EffectList effects={detail.reality.effects} />
                </div>
              )}
            </section>
          )}
          {detail.canChoose ? (
            <Button
              variant="primary"
              className="hex-choose"
              disabled={pending}
              onClick={() => onChoose(detail.hex)}
            >
              {pending ? "Mengirim..." : detail.chooseLabel}
            </Button>
          ) : null}
          <Button variant="outlined" className="hex-close" onClick={onClose}>
            Tutup
          </Button>
        </>
      ) : null}
    </SidePanel>
  );
}
