"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, readSettings, writeSettings, type Settings } from "@/lib/settings";

const ROWS: { key: keyof Settings; label: string }[] = [
  { key: "music", label: "Musik" },
  { key: "sfx", label: "Efek suara" },
  { key: "inviteNotifications", label: "Notifikasi Ajakan" },
];

export function SettingsScreen() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setSettings(readSettings());
      setLoaded(true);
    });
  }, []);

  function toggle(key: keyof Settings) {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    writeSettings(next);
  }

  return (
    <main className="lobby-desk min-h-screen px-4 py-8 text-[#3b2a12]">
      <div className="lobby-folder mx-auto grid w-full max-w-md gap-4 rounded-2xl border-2 border-[#3b2a12]/70 p-6">
        <h1 className="text-3xl font-black">Pengaturan</h1>
        <ul className="grid gap-2">
          {ROWS.map(({ key, label }) => (
            <li key={key} className="lobby-paper-card flex items-center justify-between gap-3 rounded-xl p-3">
              <span id={`set-${key}`} className="text-base font-extrabold">{label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={settings[key]}
                aria-labelledby={`set-${key}`}
                disabled={!loaded}
                onClick={() => toggle(key)}
                className={`lobby-comic-btn relative h-8 w-14 rounded-full ${settings[key] ? "bg-[#8bd450]" : "bg-[#c9b98f]"}`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${settings[key] ? "left-7" : "left-0.5"}`}
                />
              </button>
            </li>
          ))}
        </ul>
        <Link
          href="/"
          className="lobby-comic-btn w-fit rounded-lg bg-[#8bd450] px-4 py-2 font-bold text-[#2d5a12]"
        >
          ← Kembali
        </Link>
      </div>
    </main>
  );
}
