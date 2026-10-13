import { formatRupiah } from "@pejuang/shared";
import type { Effect } from "@pejuang/shared";
import type { HexDetailView } from "@/lib/hex-detail";
import BottomSheet from "../ui/BottomSheet";
import Button from "../ui/Button";
import Chip from "../ui/Chip";
import { RiskIndicator } from "./legends";

const STAT_LABEL: Record<Effect["stat"], string> = {
  wealth: "Kekayaan",
  debt: "Hutang",
  health: "Kesehatan",
  stress: "Level stres",
};

const OUTCOME_LABEL = {
  zonk: "Zonk",
  safe: "Aman",
  lucky: "Beruntung",
} as const;

function effectValue(effect: Effect): string {
  const value = effect.stat === "wealth" || effect.stat === "debt"
    ? formatRupiah(effect.delta)
    : String(Math.abs(effect.delta));
  return `${effect.delta > 0 ? "+" : effect.delta < 0 ? "−" : ""}${value.replace("-", "")}`;
}

function EffectList({ effects }: { effects: Effect[] }) {
  return (
    <ul className="grid gap-1">
      {effects.map((effect, index) => (
        <li key={`${effect.stat}-${index}`} className="text-body-sm text-teks-utama">
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

/** Bottom sheet Detail Heksa: heksa menyala (bisa dipilih) atau heksa terbuka (hanya dibaca). */
export default function HexDetailSheet({ detail, pending, onChoose, onClose }: HexDetailSheetProps) {
  return (
    <BottomSheet
      open={detail !== null}
      title={detail ? `${detail.icon} ${detail.title}`.trim() : "Detail heksa"}
      onClose={onClose}
    >
      {detail ? (
        <div className="grid gap-3">
          {detail.source === "lit" ? (
            <p className="text-label text-teks-sekunder">Hanya kamu yang bisa melihat ini</p>
          ) : null}
          {detail.risk ? <RiskIndicator risk={detail.risk} /> : null}
          {detail.riskTags.length > 0 ? (
            <ul aria-label="Tag risiko" className="flex flex-wrap gap-2">
              {detail.riskTags.map((tag) => (
                <li key={tag}><Chip>{tag}</Chip></li>
              ))}
            </ul>
          ) : null}
          <section className="grid gap-2">
            <h3 className="text-title text-teks-utama">Rencana</h3>
            <EffectList effects={detail.plan} />
          </section>
          {detail.reality.state !== "none" ? (
            <section className="grid gap-1">
              <h3 className="text-title text-teks-utama">Realita</h3>
              {detail.reality.state === "locked" ? (
                <p className="text-body-sm text-teks-sekunder">🔒 {detail.reality.text}</p>
              ) : (
                <>
                  <p className="text-body-sm text-teks-utama">
                    {OUTCOME_LABEL[detail.reality.outcome]} · {detail.reality.text}
                  </p>
                  <EffectList effects={detail.reality.effects} />
                </>
              )}
            </section>
          ) : null}
          {detail.canChoose ? (
            <Button
              variant="primary"
              disabled={pending}
              onClick={() => onChoose(detail.hex)}
            >
              {pending ? "Mengirim..." : detail.chooseLabel}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            Tutup
          </Button>
        </div>
      ) : null}
    </BottomSheet>
  );
}
