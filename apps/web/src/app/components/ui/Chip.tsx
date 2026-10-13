import type { HTMLAttributes } from "react";

export type ChipProps = HTMLAttributes<HTMLSpanElement>;

/** Chip kecil: selalu ikon + teks (jangan hanya warna). */
export default function Chip({ className = "", ...rest }: ChipProps) {
  return <span className={`ui-chip ${className}`} {...rest} />;
}
