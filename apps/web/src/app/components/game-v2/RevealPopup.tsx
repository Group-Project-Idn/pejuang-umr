import Image from "next/image";
import { getAvatarSrc } from "@/lib/avatars";
import { OUTCOME_LABEL, type RevealRow } from "@/lib/reveal";
import CategoryIcon from "./CategoryIcon";
import { EffectList } from "./HexDetailSheet";

/** Bentuk/ikon berbeda per hasil, supaya tidak hanya bergantung pada warna. */
const STAMP_ICON = { zonk: "✖", safe: "■", lucky: "★" } as const;

export type RevealPopupProps = {
  rows: readonly RevealRow[];
  onMinimize: () => void;
};

/** Kartu map non-modal di tengah papan; hanya kartu yang menerima pointer. */
export default function RevealPopup({ rows, onMinimize }: RevealPopupProps) {
  return (
    <div className="reveal-popup-wrap">
      <section role="dialog" aria-label="Fase Pembalikan" className="paper-panel reveal-popup">
        <span aria-hidden="true" className="hex-card-clip" />
        <div className="reveal-popup-scroll">
          <h2 className="hex-card-title">FASE PEMBALIKAN</h2>
          <p className="reveal-popup-sub">Realita dibuka sesuai urutan giliran</p>
          <ol className="reveal-rows" aria-live="polite">
            {rows.map((row) => (
              <li key={row.playerId} className={`reveal-row reveal-row-${row.status}`}>
                <div className="reveal-row-head">
                  <Image src={getAvatarSrc(row.avatarId)} alt="" width={30} height={30} className="size-[30px] object-contain" />
                  <strong>{row.name}</strong>
                  <span className="reveal-row-tile">
                    <CategoryIcon category={row.category} />
                    {row.title}
                  </span>
                </div>
                {row.status === "waiting" ? (
                  <p className="reveal-row-wait">Menunggu dibuka...</p>
                ) : row.status === "active" ? (
                  <p className="reveal-row-wait reveal-row-flip">Membuka Realita...</p>
                ) : row.reality?.state === "revealed" ? (
                  <div className="reveal-row-body reveal-row-flip">
                    <span className={`hex-stamp hex-stamp-${row.reality.outcome} reveal-stamp-${row.reality.outcome}`}>
                      <span aria-hidden="true">{STAMP_ICON[row.reality.outcome]}</span>{" "}
                      {OUTCOME_LABEL[row.reality.outcome].toUpperCase()}
                    </span>
                    <p>{row.reality.text}</p>
                    <EffectList effects={row.reality.effects} />
                  </div>
                ) : (
                  <p className="hex-gold-note reveal-row-flip"><span aria-hidden="true">✦</span> Tanpa Realita</p>
                )}
              </li>
            ))}
          </ol>
          <button type="button" className="reveal-minimize" onClick={onMinimize}>Lihat papan</button>
        </div>
      </section>
    </div>
  );
}
