import { formatRupiah } from "@pejuang/shared";
import { DEBT_LIMIT } from "@/design/tokens";

export type BadgeProps = {
  amount: number;
};

/** Hutang sebagai angka + badge (jangan pakai progress bar). */
export default function Badge({ amount }: BadgeProps) {
  const danger = amount >= DEBT_LIMIT * 0.8;
  return (
    <span
      className={`ui-badge ${danger ? "ui-badge-danger" : ""}`}
      role="status"
      aria-label={`Hutang ${formatRupiah(amount)} dari batas ${formatRupiah(DEBT_LIMIT)}`}
    >
      <span aria-hidden="true">−</span>
      <span>{formatRupiah(amount)}</span>
    </span>
  );
}
