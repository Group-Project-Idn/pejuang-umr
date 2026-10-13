"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getHealth } from "@/lib/api-client";
import { markInternalNavigation } from "@/lib/back-target";
import { ProfileIconBadge, SettingsGearIcon } from "./home-icons";

type ServerState = "memeriksa" | "normal" | "bermasalah";

const MENU_BASE =
  "lobby-comic-btn grid w-full justify-items-center rounded-xl px-4 py-2 text-center text-white";

/** Home: judul dan tombol adalah DOM di atas gambar latar, bukan gambar utuh. */
export function HomeScreen() {
  const [server, setServer] = useState<ServerState>("memeriksa");

  const checkServer = useCallback(() => {
    setServer("memeriksa");
    getHealth().then(() => setServer("normal")).catch(() => setServer("bermasalah"));
  }, []);

  useEffect(() => {
    // Microtask agar setState tidak sinkron di dalam efek.
    queueMicrotask(checkServer);
  }, [checkServer]);

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-[#2a1d18] text-white">
      <Image
        src="/images/home-bg.jpeg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* Scrim: menggelapkan kolom tengah dan bawah agar teks terbaca. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 75% at 50% 52%, rgba(20,12,8,0.62), rgba(20,12,8,0.18) 100%), linear-gradient(180deg, rgba(20,12,8,0.15) 0%, rgba(20,12,8,0.4) 100%)",
        }}
      />

      <div className="relative flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-4 py-10">
        <header className="grid justify-items-center gap-2 text-center">
          <h1
            className="text-5xl font-black italic uppercase tracking-tight text-[#f4f1ea] sm:text-6xl"
            style={{ textShadow: "0 4px 0 #3b2a12, 0 0 18px rgba(0,0,0,0.5)" }}
          >
            PEJUANG UMR
          </h1>
          <p className="rounded-md border-2 border-[#3b2a12] bg-[#5a3a1e] px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[#f5d56b] sm:text-sm">
            Jakarta Survival: Edisi Akhir Bulan No Cap
          </p>
        </header>

        <nav aria-label="Menu utama" className="grid w-full gap-3">
          <div aria-disabled="true" className={`${MENU_BASE} cursor-default border-[#0b4f66] bg-[#0e6f8c] opacity-95`}>
            <span className="text-2xl font-black italic">Singel</span>
            <span className="text-xs font-semibold">Push rank karier sendirian</span>
          </div>
          <Link href="/lobby" className={`${MENU_BASE} bg-[#3f7d1a]`}>
            <span className="text-2xl font-black italic">Mabar</span>
            <span className="text-xs font-semibold">Adu nasib 2-4 pemain</span>
          </Link>
          <Link
            href="/cara-main"
            onClick={() => markInternalNavigation()}
            className={`${MENU_BASE} bg-[#b45f06]`}
          >
            <span className="text-2xl font-black italic">Spill Cara Main</span>
            <span className="text-xs font-semibold">Tutorial biar nggak noob</span>
          </Link>
          <div aria-disabled="true" className={`${MENU_BASE} cursor-default border-[#5c1710] bg-[#b3261e] opacity-95`}>
            <span className="text-2xl font-black italic">Ajang Flexing</span>
            <span className="text-xs font-semibold">Hall of Fame</span>
          </div>
        </nav>

        <div className="flex w-full items-center justify-center gap-3">
          <ProfileIconBadge />
          <div className="flex min-w-0 flex-col items-center gap-1">
            <p
              role="status"
              className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${
                server === "bermasalah" ? "bg-[#f4b7ae] text-[#7c2a19]" : "bg-black/75 text-white"
              }`}
            >
              {server === "normal" ? (
                <>
                  <span aria-hidden="true" className="mr-1.5 inline-block size-2 rounded-full bg-[#4ade80]" />
                  SERVER JAKARTA PUSAT: NORMAL
                </>
              ) : server === "memeriksa" ? (
                "Memeriksa server..."
              ) : (
                "Server bermasalah. Periksa koneksi lalu tekan Coba lagi."
              )}
            </p>
            {server === "bermasalah" ? (
              <button
                type="button"
                onClick={checkServer}
                className="lobby-comic-btn min-h-9 rounded-lg bg-[#f5a623] px-3 py-1 text-sm font-bold text-[#3b2a12]"
              >
                Coba lagi
              </button>
            ) : null}
          </div>
          <Link
            href="/pengaturan"
            aria-label="Pengaturan"
            className="lobby-comic-btn grid size-11 place-items-center rounded-full bg-[#f5a623]"
          >
            <SettingsGearIcon />
          </Link>
        </div>
      </div>

      <footer className="relative w-full bg-black/80 px-3 py-1.5 text-center text-xs font-semibold">
        Gaji UMR DKI 2026 • Hindari Pinjol &amp; Kopi Kekinian • Tetap Waras di Jam Sibuk
      </footer>
    </main>
  );
}
