"use client";

import { formatRupiah, type ErrorCode, type MonthSummaryPayload } from "@pejuang/shared";
import { useEffect, useState } from "react";
import BottomSheet from "../ui/BottomSheet";
import Button from "../ui/Button";

export function getMonthPaymentSeconds(deadline: number, serverNow: number): number {
  return Math.max(0, Math.ceil((deadline - serverNow) / 1000));
}

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

export default function MonthChangeView({ summary, pending, serverClockOffsetMs, error, onPayDebt }: {
  summary: MonthSummaryPayload | null;
  pending: boolean;
  serverClockOffsetMs: number;
  error?: string;
  onPayDebt: (month: number, amount: number) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!summary?.payDebt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [summary?.payDebt]);

  const seconds = summary?.payDebt
    ? getMonthPaymentSeconds(summary.payDebt.deadline, now + serverClockOffsetMs)
    : 0;

  return (
    <BottomSheet open={summary !== null} title="Ganti Bulan" onClose={() => undefined}>
      {summary ? (
        <div className="grid gap-3 text-body-sm">
          <p>Bulan {summary.month}</p>
          <dl className="grid grid-cols-2 gap-2">
            <dt>Gaji masuk</dt><dd className="text-right">+{formatRupiah(summary.salary)}</dd>
            <dt>Biaya hidup wajib</dt><dd className="text-right">-{formatRupiah(summary.livingCost)}</dd>
            <dt>Bunga hutang</dt><dd className="text-right">-{formatRupiah(summary.interest)}</dd>
            {summary.interestAddedToDebt > 0 ? (
              <><dt>Bunga menjadi hutang</dt><dd className="text-right">{formatRupiah(summary.interestAddedToDebt)}</dd></>
            ) : null}
            <dt>Kekayaan baru</dt><dd className="text-right">{formatRupiah(summary.after.wealth)}</dd>
            <dt>Hutang baru</dt><dd className="text-right">{formatRupiah(summary.after.debt)}</dd>
          </dl>
          {summary.payDebt ? (
            <MonthDebtPayment
              key={summary.month}
              month={summary.month}
              max={summary.payDebt.max}
              seconds={seconds}
              pending={pending}
              error={error}
              onPayDebt={onPayDebt}
            />
          ) : <p>Menunggu proses Ganti Bulan selesai. Kamu tidak perlu mengirim pembayaran lagi.</p>}
        </div>
      ) : null}
    </BottomSheet>
  );
}


function MonthDebtPayment({
  month,
  max,
  seconds,
  pending,
  error,
  onPayDebt,
}: {
  month: number;
  max: number;
  seconds: number;
  pending: boolean;
  error?: string;
  onPayDebt: (month: number, amount: number) => void;
}) {
  const [position, setPosition] = useState(0);
  const positions = getDebtSliderPositions(max);
  const amount = debtPositionToAmount(Math.min(position, positions), max);
  const cannotAfford = max === 0;

  return (
    <form className="grid gap-3" onSubmit={(event) => {
      event.preventDefault();
      if (seconds > 0 && !pending) onPayDebt(month, amount);
    }}>
      <label htmlFor="month-debt-amount">Bayar hutang: {formatRupiah(amount)}</label>
      <input id="month-debt-amount" type="range" min={0} max={positions} step={1}
        value={Math.min(position, positions)}
        onChange={(event) => setPosition(Number(event.target.value))}
        disabled={pending || seconds === 0 || cannotAfford} />
      {cannotAfford ? <p>{DEBT_UNAFFORDABLE_TEXT}</p> : null}
      <p>Waktu tersisa: {seconds} detik</p>
      {error ? <p role="alert" className="text-body-sm">{error}</p> : null}
      <Button variant="primary" type="submit" disabled={pending || seconds === 0}>
        {pending ? "Mengirim..." : cannotAfford ? "Lewati" : "Konfirmasi pembayaran"}
      </Button>
    </form>
  );
}
