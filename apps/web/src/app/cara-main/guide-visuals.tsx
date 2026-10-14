import type { ReactNode } from "react";
import { formatRupiah } from "@pejuang/shared";
import { TILE_DETAILS } from "@/data/game";
import CardIllustration from "../components/game/CardIllustration";
import CalendarCard from "../components/game/CalendarCard";
import CategoryIcon from "../components/game/CategoryIcon";
import { EffectList } from "../components/game/HexDetailSheet";
import { RiskIndicator } from "../components/game/legends";

/** Semua visual panduan adalah contoh statis: tidak memuat state permainan atau isi heksa rahasia. */
export function GuideFigure({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="ui-note min-w-0 space-y-3 rounded-xl p-4">
      {children}
      <figcaption className="border-t border-[#3b2a12]/30 pt-2 text-sm font-semibold">{caption}</figcaption>
    </figure>
  );
}

export function FlowFigure({
  caption,
  steps,
}: {
  caption: string;
  steps: readonly { title: string; note: string }[];
}) {
  return (
    <GuideFigure caption={caption}>
      <ol className="grid gap-2 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="min-w-0 rounded-xl border-2 border-[#3b2a12]/70 bg-[#fff3bf] p-3">
            <span className="font-heading text-lg font-bold">{index + 1}. {step.title}</span>
            <p className="mt-1 text-sm">{step.note}</p>
          </li>
        ))}
      </ol>
    </GuideFigure>
  );
}

export function BoardFigure() {
  return (
    <GuideFigure caption="Contoh skematis, bukan isi papan asli. Hanya heksa yang menyala dapat dipilih di giliranmu.">
      <div className="grid grid-cols-3 gap-2 text-center text-sm font-bold sm:max-w-md" aria-label="Contoh pion dan tiga status heksa">
        <span className="rounded-xl border-2 border-[#3b2a12] bg-[#343941] p-3 text-white">Tertutup</span>
        <span className="rounded-xl border-2 border-[#8c5d00] bg-[#fff2a8] p-3">✦ Menyala</span>
        <span className="rounded-xl border-2 border-[#3b2a12] bg-[#f2e8cf] p-3">Terbuka</span>
        <span className="col-start-2 rounded-xl border-2 border-[#3b2a12] bg-[#7fb0f5] p-3">● Pionmu</span>
      </div>
      <p className="text-sm">Tertutup = belum diinjak. Menyala = opsi yang bisa diperiksa dan dipilih. Terbuka = sudah diinjak, bisa dilihat lagi, tidak bisa dimasuki.</p>
    </GuideFigure>
  );
}

export function TileFigure() {
  return (
    <GuideFigure caption="Contoh detail petak, bukan bocoran hasil. Angka Rencana hanya contoh; hasil Realita belum diketahui saat memilih.">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0 rounded-xl border-2 border-[#3b2a12] bg-[#fff3bf] p-3">
          <strong className="font-heading text-lg">Contoh: petak Kerja</strong>
          <CardIllustration category="work" />
          <p className="mb-2 font-bold">RENCANA · berlaku setelah bergerak</p>
          <EffectList effects={[{ stat: "wealth", delta: 500_000 }]} />
          <div className="mt-3"><RiskIndicator risk="medium" /></div>
          <p className="mt-2 rounded-lg bg-[#8bd450] p-2 text-center font-bold">PILIH HEKSA INI</p>
        </div>
        <div className="min-w-0 rounded-xl border-2 border-[#3b2a12] bg-[#fff3bf] p-3">
          <strong className="font-heading text-lg">Akhir ronde: REALITA</strong>
          <p className="mt-2">Hasilnya baru dibuka: Zonk, Aman, atau Hoki. Jika hasilnya Zonk, efek Realita dikali 2; Rencana tidak dikali.</p>
          <p className="mt-3 font-bold">Petak Emas berbeda: hanya punya Rencana, tanpa Realita.</p>
        </div>
      </div>
    </GuideFigure>
  );
}

export function CategoryFigure() {
  return (
    <GuideFigure caption="Ikon dan nama kategori mengikuti petak di permainan; ikon tetap disertai teks.">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(["work", "social", "health", "finance", "gold"] as const).map((category) => (
          <li key={category} className="flex min-w-0 items-center gap-2 rounded-lg border border-[#3b2a12]/50 bg-[#fff3bf] p-2 text-sm font-bold">
            <CategoryIcon category={category} size={24} />{TILE_DETAILS[category].label}
          </li>
        ))}
      </ul>
    </GuideFigure>
  );
}

export function StatusFigure() {
  return (
    <GuideFigure caption="Contoh status awal milikmu saja; lawan hanya melihat Skor Sementara di Papan Skor.">
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 rounded-xl border-2 border-[#3b2a12] bg-[#fff3bf] p-3 text-sm sm:max-w-md">
        <dt>● Kekayaan</dt><dd className="type-number text-right font-bold">{formatRupiah(7_500_000)}</dd>
        <dt>▼ Hutang</dt><dd className="type-number text-right font-bold">{formatRupiah(0)}</dd>
        <dt>♥ Kesehatan</dt><dd className="type-number text-right font-bold">10/10</dd>
        <dt>⚡ Level Stress</dt><dd className="type-number text-right font-bold">0/10</dd>
      </dl>
    </GuideFigure>
  );
}

export function CalendarFigure() {
  return (
    <GuideFigure caption="Contoh kalender: langkah menunjukkan posisi waktumu, musim menunjukkan kategori yang lebih rawan.">
      <CalendarCard calendar={{
        dateLabel: "1 Maret", step: 5, totalSteps: 24, round: 5, month: 3,
        season: "transition", seasonHint: "Pancaroba: petak Kesehatan lebih rawan",
        nextEvent: null,
      }} />
    </GuideFigure>
  );
}