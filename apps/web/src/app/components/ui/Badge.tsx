import { formatRupiah } from "@pejuang/shared";
import type { HTMLAttributes } from "react";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  amount: number;
};

/**
 * Badge Hutang: angka + latar merah tua (per guide: bukan progress bar,
 * supaya tidak tertukar dengan Level Stres).
 */
export default function Badge({ amount, className = "", ...rest }: BadgeProps) {
  return (
    <span
      className={`pu-numeral inline-flex items-center gap-1 rounded-full bg-bahaya-tua px-2 py-1 text-label text-bahaya-pucat ${className}`}
      {...rest}
    >
      <span aria-hidden="true">−</span>
      <span>{formatRupiah(amount)}</span>
    </span>
  );
}
