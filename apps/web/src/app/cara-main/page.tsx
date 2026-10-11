import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cara Main — Pejuang UMR",
  description: "Aturan singkat Pejuang UMR: 2-4 pemain, 24 langkah, 12 bulan.",
};

const STEPS = [
  "Masuk sebagai tamu: isi nama 2-20 karakter lalu pilih avatar.",
  "Host tekan BUAT ROOM (HOST), bagikan kode UMR-XXXX ke 1-3 teman.",
  "Teman isi kode room lalu tekan GABUNG.",
  "Di Room, host atur timer; permainan dapat dimulai setelah ada minimal 2 pemain dan semua pemain selain host sudah Siap.",
  "1 permainan = 12 bulan (24 langkah). Jaga Kekayaan, Kesehatan 0-10, dan Level Stress 0-10.",
] as const;

export default function CaraMainPage() {
  return (
    <main className="lobby-desk min-h-screen px-4 py-8 text-[#3b2a12]">
      <div className="lobby-folder mx-auto grid w-full max-w-2xl gap-4 rounded-2xl border-2 border-[#3b2a12]/70 p-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6b4a1f]">
          Ruang Rapat
        </p>
        <h1 className="text-3xl font-black">Cara Main</h1>
        <ol className="grid list-decimal gap-2 pl-6 text-sm font-medium">
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <Link
          href="/lobby"
          className="lobby-comic-btn w-fit rounded-lg bg-[#8bd450] px-4 py-2 font-bold text-[#2d5a12]"
        >
          ← Kembali ke Lobby
        </Link>
      </div>
    </main>
  );
}
