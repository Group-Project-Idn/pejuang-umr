import type { PawnId } from "@pejuang/shared";
import { PAWN_DETAILS } from "@/data/game";
import Image from "next/image";

export type PawnProps = {
  pawn: PawnId;
  name: string;
  isActive: boolean;
};

/** Pion karakter chibi di atas heksa, ring saat giliran aktif. */
export default function Pawn({ pawn, name, isActive }: PawnProps) {
  const detail = PAWN_DETAILS[pawn];
  return (
    <span
      className={`grid size-12 place-items-center overflow-hidden rounded-full border-2 bg-kartu-tinggi ${
        isActive ? "border-indikator-kekayaan" : "border-garis"
      }`}
      role="img"
      aria-label={`Pion ${name}${isActive ? ", giliran aktif" : ""}`}
      style={isActive ? { boxShadow: `0 0 0 2px ${detail.accent}` } : undefined}
    >
      <Image src={detail.sprite} alt="" width={40} height={40} className="size-10 object-cover" />
    </span>
  );
}
