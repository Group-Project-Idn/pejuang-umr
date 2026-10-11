import type { Effect, TileOption } from "@pejuang/shared";
import { TILE_DETAILS } from "@/data/game";
import BottomSheet from "../ui/BottomSheet";
import Button from "../ui/Button";
import { RiskIndicator } from "./legends";

const STAT_LABEL: Record<Effect["stat"], string> = {
  wealth: "Kekayaan",
  debt: "Hutang",
  health: "Kesehatan",
  stress: "Level stres",
};

export type HexDetailSheetProps = {
  option: TileOption | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: (option: TileOption) => void;
};

/** Bottom sheet Detail Heksa: Rencana + risiko sebelum konfirmasi (guide). */
export default function HexDetailSheet({ option, pending, onClose, onConfirm }: HexDetailSheetProps) {
  return (
    <BottomSheet open={option !== null} title={option ? TILE_DETAILS[option.category].label : "Detail heksa"} onClose={onClose}>
      {option ? (
        <div className="grid gap-4">
          <div className="grid gap-1">
            <p className="text-title text-teks-utama">{option.title}</p>
            <RiskIndicator risk={option.risk} />
            {option.isGold ? <p className="text-body-sm text-utama">✦ Petak Emas</p> : null}
          </div>
          <div className="grid gap-1">
            <h3 className="text-label font-semibold text-teks-sekunder">Rencana petak</h3>
            <ul className="grid gap-1">
              {option.plan.map((effect, index) => (
                <li key={`${effect.stat}-${index}`} className="text-body-sm text-teks-utama">
                  {STAT_LABEL[effect.stat]} {effect.delta > 0 ? `+${effect.delta}` : effect.delta}
                </li>
              ))}
            </ul>
          </div>
          {option.riskTags.length > 0 ? (
            <p className="text-body-sm text-teks-sekunder">Tanda risiko: {option.riskTags.join(", ")}</p>
          ) : null}
          <Button variant="primary" disabled={pending} onClick={() => onConfirm(option)}>
            {pending ? "Mengirim..." : "Pilih heksa ini"}
          </Button>
          <Button variant="outlined" onClick={onClose}>
            Kembali
          </Button>
        </div>
      ) : null}
    </BottomSheet>
  );
}
