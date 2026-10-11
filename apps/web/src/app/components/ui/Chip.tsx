import type { HTMLAttributes, ReactNode } from "react";

export type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
};

/** Label kecil radius sm untuk kategori, status, musim. */
export default function Chip({ children, className = "", ...rest }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm bg-kartu-tinggi px-2 py-1 text-label text-teks-utama ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
