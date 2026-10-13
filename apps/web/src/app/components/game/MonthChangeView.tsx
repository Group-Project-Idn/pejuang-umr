"use client";

import { formatRupiah, type MonthSummaryPayload } from "@pejuang/shared";
import { useEffect, useState } from "react";
import BottomSheet from "../ui/BottomSheet";
import Button from "../ui/Button";

export function getMonthPaymentSeconds(deadline: number, serverNow: number): number {
  return Math.max(0, Math.ceil((deadline - serverNow) / 1000));
}

export default function MonthChangeView({ summary, pending, serverClockOffsetMs, onPayDebt }: {
  summary: MonthSummaryPayload | null;
  pending: boolean;
  serverClockOffsetMs: number;
  onPayDebt: (month: number, amount: number) => void;
}) {
  const [amount, setAmount] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setAmount(0);
  }, [summary?.month]);
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
            <form className="grid gap-3" onSubmit={(event) => {
              event.preventDefault();
              if (seconds > 0 && !pending) onPayDebt(summary.month, amount);
            }}>
              <label htmlFor="month-debt-amount">Bayar hutang: {formatRupiah(amount)}</label>
              <input id="month-debt-amount" type="range" min={0} max={summary.payDebt.max} step={1}
                value={Math.min(amount, summary.payDebt.max)}
                onChange={(event) => setAmount(Number(event.target.value))}
                disabled={pending || seconds === 0 || summary.payDebt.max === 0} />
              <p>Waktu tersisa: {seconds} detik</p>
              <Button variant="primary" type="submit" disabled={pending || seconds === 0}>
                {pending ? "Mengirim..." : "Konfirmasi pembayaran"}
              </Button>
            </form>
          ) : <p>Tidak ada hutang. Menunggu giliran dimulai...</p>}
        </div>
      ) : null}
    </BottomSheet>
  );
}