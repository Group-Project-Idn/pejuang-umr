export type TimerRingProps = {
  /** Detik tersisa (null = tidak ada batas). */
  secondsLeft: number | null;
  /** Total detik satu giliran, untuk proporsi cincin. */
  totalSeconds: number;
  label?: string;
};

/** Timer berbentuk cincin (SVG) dengan teks DOM di tengah. */
export default function TimerRing({ secondsLeft, totalSeconds, label = "Sisa giliran" }: TimerRingProps) {
  if (secondsLeft === null) {
    return (
      <span className="grid size-11 shrink-0 place-items-center rounded-full border border-garis bg-kartu text-label text-teks-utama" aria-label={label}>
        —
      </span>
    );
  }
  const safeTotal = Math.max(1, totalSeconds);
  const safeLeft = Math.max(0, Math.min(safeTotal, secondsLeft));
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - safeLeft / safeTotal);
  return (
    <span
      role="timer"
      aria-label={`${label}: ${Math.ceil(safeLeft)} detik`}
      className="relative grid size-11 shrink-0 place-items-center"
    >
      <svg viewBox="0 0 44 44" className="absolute inset-0 size-11 -rotate-90" aria-hidden="true">
        <circle cx="22" cy="22" r={radius} fill="none" strokeWidth="5" className="stroke-kartu-tinggi" />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-utama"
        />
      </svg>
      <span className="pu-numeral text-label text-teks-utama">{Math.ceil(safeLeft)}</span>
    </span>
  );
}
