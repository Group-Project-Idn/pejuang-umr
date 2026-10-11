export type TimerRingProps = {
  /** Sisa detik untuk timer authoritative. */
  secondsLeft: number;
  totalSeconds: number;
  label?: string;
};

/** Timer cincin SVG: status giliran + kalender + ajakan. */
export default function TimerRing({ secondsLeft, totalSeconds, label = "Sisa waktu" }: TimerRingProps) {
  const safe = Math.max(0, Math.min(totalSeconds, secondsLeft));
  const radius = 15.5;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? safe / totalSeconds : 0;
  return (
    <div
      className="grid size-16 place-items-center rounded-full bg-kartu-tinggi"
      role="timer"
      aria-label={`${label}: ${safe} detik`}
    >
      <svg viewBox="0 0 36 36" className="size-16 -rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r={radius} fill="none" strokeWidth="3.5" className="stroke-garis" />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${progress * circumference} ${circumference}`}
          className="stroke-indikator-kekayaan"
        />
      </svg>
      <strong className="-mt-16 text-body tabular-nums text-teks-utama">{safe}</strong>
    </div>
  );
}
