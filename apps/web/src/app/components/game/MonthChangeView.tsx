"use client";

import { formatRupiah, type ErrorCode, type MonthSummaryPayload } from "@pejuang/shared";
import { useState } from "react";
import Button from "../ui/Button";

export const DEBT_SLIDER_STEP = 50_000;
export const DEBT_UNAFFORDABLE_TEXT = "Kekayaanmu belum cukup untuk mencicil";
export const DEBT_CLEARED_NOTICE = "Hutang lunas! Level Stress -2";

/** Teks UI dari API_CONTRACT Bagian 15 untuk galat month:pay-debt. */
const PAY_DEBT_ERROR_TEXT: Partial<Record<ErrorCode, string>> = {
  PAYMENT_CLOSED: "Waktu habis, Hutang tidak dibayar bulan ini.",
  INVALID_PAYLOAD: "Ada yang salah. Coba lagi.",
};

export function getPayDebtErrorMessage(error: ErrorCode): string {
  return PAY_DEBT_ERROR_TEXT[error] ?? "Server lagi bermasalah. Coba lagi.";
}

/** Jumlah posisi slider: kelipatan Rp50.000 ditambah satu posisi untuk nilai maksimum. */
export function getDebtSliderPositions(max: number): number {
  return Math.ceil(max / DEBT_SLIDER_STEP);
}

/** Posisi terakhir slider selalu bernilai max, walau max bukan kelipatan langkah. */
export function debtPositionToAmount(position: number, max: number): number {
  return Math.min(Math.max(0, position) * DEBT_SLIDER_STEP, max);
}

/** Isi kartu Ganti Bulan: nota, lalu slider Bayar Hutang bila berhutang. Bingkai dan hitung mundur ada di PopupGrid. */
export default function MonthChangeView({ summary, pending, expired, error, onPayDebt }: {
  summary: MonthSummaryPayload;
  pending: boolean;
  /** Hitung mundur bersama sudah habis. */
  expired: boolean;
  error?: string;
  onPayDebt: (month: number, amount: number) => void;
}) {
  return (
    <div className="comic-month grid gap-3 text-body-sm">
      <p className="ui-stamp">Bulan {summary.month}</p>
      <dl className="comic-receipt">
        <div className="comic-receipt-row"><dt>Gaji masuk</dt><dd className="comic-amount-positive">+{formatRupiah(summary.salary)}</dd></div>
        <div className="comic-receipt-row"><dt>Biaya hidup wajib</dt><dd className="comic-amount-negative">−{formatRupiah(summary.livingCost)}</dd></div>
        <div className="comic-receipt-row"><dt>Bunga hutang</dt><dd className="comic-amount-negative">−{formatRupiah(summary.interest)}</dd></div>
        {summary.interestAddedToDebt > 0 ? (
          <div className="comic-receipt-row"><dt>Bunga menjadi hutang</dt><dd className="comic-amount-negative">+{formatRupiah(summary.interestAddedToDebt)}</dd></div>
        ) : null}
        <div className="comic-receipt-row comic-receipt-total"><dt>Kekayaan baru</dt><dd className={summary.after.wealth < 0 ? "comic-amount-negative" : "comic-amount-positive"}>{summary.after.wealth >= 0 ? "+" : "−"}{formatRupiah(Math.abs(summary.after.wealth))}</dd></div>
        <div className="comic-receipt-row comic-receipt-total"><dt>Hutang baru</dt><dd className="comic-amount-negative">+{formatRupiah(summary.after.debt)}</dd></div>
      </dl>
      {summary.payDebt ? (
        <MonthDebtPayment
          key={summary.month}
          month={summary.month}
          max={summary.payDebt.max}
          expired={expired}
          pending={pending}
          error={error}
          onPayDebt={onPayDebt}
        />
      ) : null}
    </div>
  );
}


function MonthDebtPayment({
  month,
  max,
  expired,
  pending,
  error,
  onPayDebt,
}: {
  month: number;
  max: number;
  expired: boolean;
  pending: boolean;
  error?: string;
  onPayDebt: (month: number, amount: number) => void;
}) {
  const [position, setPosition] = useState(0);
  const positions = getDebtSliderPositions(max);
  const amount = debtPositionToAmount(Math.min(position, positions), max);
  const cannotAfford = max === 0;

  return (
    <form className="comic-payment grid gap-3" onSubmit={(event) => {
      event.preventDefault();
      if (!expired && !pending) onPayDebt(month, amount);
    }}>
      <label htmlFor="month-debt-amount">Bayar hutang: <strong className="comic-payment-amount">{formatRupiah(amount)}</strong></label>
      <input id="month-debt-amount" type="range" min={0} max={positions} step={1}
        className="comic-debt-slider"
        value={Math.min(position, positions)}
        onChange={(event) => setPosition(Number(event.target.value))}
        disabled={pending || expired || cannotAfford} />
      {cannotAfford ? <p>{DEBT_UNAFFORDABLE_TEXT}</p> : null}
      {error ? <p role="alert" className="comic-error"><span aria-hidden="true">⚠</span> {error}</p> : null}
      <Button variant="primary" type="submit" disabled={pending || expired}>
        {pending ? "Mengirim..." : cannotAfford ? "Lewati" : "Konfirmasi pembayaran"}
      </Button>
    </form>
  );
}
