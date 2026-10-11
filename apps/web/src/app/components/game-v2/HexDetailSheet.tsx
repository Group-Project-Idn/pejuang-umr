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
  onChoose: (hex: TileOption["hex"]) => void;
  onClose: () => void;
};

/** Bottom sheet Detail Heksa: Rencana terbuka, Realita terkunci sampai melangkah. */
export default function HexDetailSheet({ option, pending, onChoose, onClose }: HexDetailSheetProps) {
  const detail = option ? TILE_DETAILS[option.category] : null;
  return (
    <BottomSheet
      open={option !== null}
      title={option ? `${detail?.icon ?? ""} ${option.title}`.trim() : "Detail heksa"}
      onClose={onClose}
    >
      {option ? (
        <div className="grid gap-3">
          <p className="text-label text-teks-sekunder">Hanya kamu yang bisa melihat ini</p>
          {option.risk ? <RiskIndicator risk={option.risk} /> : null}
          <section className="grid gap-2">
            <h3 className="text-title text-teks-utama">Rencana</h3>
            <ul className="grid gap-1">
              {option.plan.map((effect, index) => (
                <li key={`${effect.stat}-${index}`} className="text-body-sm text-teks-utama">
                  {STAT_LABEL[effect.stat]} {effect.delta > 0 ? `+${effect.delta}` : effect.delta}
                </li>
              ))}
            </ul>
          </section>
          <section className="grid gap-1">
            <h3 className="text-title text-teks-utama">Realita</h3>
            <p className="text-body-sm text-teks-sekunder">🔒 Terungkap setelah kamu melangkah</p>
          </section>
          <Button
            variant="primary"
            disabled={pending}
            onClick={() => onChoose(option.hex)}
          >
            {pending ? "Mengirim..." : option.isGold ? "Ambil petak emas" : "Pilih heksa ini"}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Tutup
          </Button>
        </div>
      ) : null}
    </BottomSheet>
  );
}
