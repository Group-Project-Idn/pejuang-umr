import type { HTMLAttributes } from "react";

export type ChipProps = HTMLAttributes<HTMLSpanElement>;

/** Chip kecil: selalu ikon + teks (jangan hanya warna). */
export default function Chip({ className = "", ...rest }: ChipProps) {
  return (
    <span
      className={`inline-flex min-h-6 items-center gap-1 rounded-full border border-garis bg-kartu-tinggi px-2 py-0.5 text-label text-teks-utama ${className}`}
      {...rest}
    />
  );
}
