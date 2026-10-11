import type { PawnId } from "@pejuang/shared";
import Image from "next/image";
import { PAWN_DETAILS } from "@/data/game";

const PAWN_SHAPES: Record<PawnId, { shape: string; label: string }> = {
  "cream-circle": { shape: "●", label: "lingkaran" },
  "iceblue-square": { shape: "■", label: "persegi" },
  "mint-triangle": { shape: "▲", label: "segitiga" },
  "salmon-diamond": { shape: "◆", label: "belah ketupat" },
};

export type PawnProps = {
  pawn: PawnId;
  name: string;
  isLeader?: boolean;
  size?: number;
};

/** Pion chibi PNG + pembeda bentuk/angka (inklusif, bukan warna saja). */
export default function Pawn({ pawn, name, isLeader = false, size = 40 }: PawnProps) {
  const details = PAWN_DETAILS[pawn];
  const meta = PAWN_SHAPES[pawn];
  return (
    <span className="relative inline-grid place-items-center" role="img" aria-label={`Pion ${name}, bentuk ${meta.label}${isLeader ? ", peringkat 1" : ""}`}>
      <span
        aria-hidden="true"
        className="pu-numeral absolute -left-1 -top-1 z-10 grid size-5 place-items-center rounded-full border border-garis text-[10px] font-bold text-teks-utama"
        style={{ background: details.accent }}
      >
        {meta.shape}
      </span>
      <Image
        src={details.sprite}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ border: `2px solid ${details.accent}` }}
      />
      {isLeader ? (
        <span aria-hidden="true" className="absolute -top-3 text-base leading-none text-utama">
          ♛
        </span>
      ) : null}
    </span>
  );
}
