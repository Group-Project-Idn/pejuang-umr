"use client";

import { RoomCodeSchema } from "@pejuang/shared";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Badge, BottomNav, Button, Card, Chip, Screen } from "@/app/components/ui";

/** Layar Lobby (client): cari room via kode + info status. Navigasi via router. */
export function LobbyScreen({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = RoomCodeSchema.safeParse(code.trim().toUpperCase());
    if (!parsed.success) {
      setError("Kode room harus berbentuk UMR-1234.");
      return;
    }
    setError("");
    router.push(`/room/${parsed.data}`);
  }

  return (
    <>
      <Screen
        title="Lobby"
        subtitle="Cari room temanmu, lalu gabung dan siap-siap absen masuk."
        actions={
          <Button variant="secondary" onClick={() => router.push("/")}>
            Kembali ke beranda
          </Button>
        }
      >
        <Card title="Gabung room">
          <form onSubmit={submit} className="mt-3 grid gap-3">
            <label className="grid gap-1 text-label text-teks-sekunder">
              Kode room
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="UMR-1234"
                maxLength={8}
                autoComplete="off"
                className="min-h-11 rounded-sm border border-garis bg-kartu-tinggi px-3 py-2 text-body uppercase text-teks-utama"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "lobby-code-error" : undefined}
              />
            </label>
            {error ? (
              <p id="lobby-code-error" role="alert" className="text-body-sm text-bahaya-lembut">
                {error}
              </p>
            ) : null}
            <Button variant="primary" type="submit">
              Gabung room
            </Button>
          </form>
        </Card>
        <Card title="Aturan singkat">
          <ul className="mt-2 grid gap-2 text-body-sm text-teks-sekunder">
            <li className="flex items-center gap-2">
              <Chip><span aria-hidden="true">●</span> Kekayaan</Chip>
              Kumpulkan skor tertinggi sampai langkah 24.
            </li>
            <li className="flex items-center gap-2">
              <Chip><span aria-hidden="true">−</span> Hutang</Chip>
              <Badge amount={250000} /> Jaga agar tidak melewati batas Rp25jt.
            </li>
            <li className="flex items-center gap-2">
              <Chip><span aria-hidden="true">♥</span> Sehat</Chip>
              Stres 10 atau kesehatan 0 membuatmu tumbang.
            </li>
          </ul>
        </Card>
      </Screen>
      <BottomNav active="Lobby" />
    </>
  );
}
