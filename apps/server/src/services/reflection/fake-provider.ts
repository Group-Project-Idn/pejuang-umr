import type { ReflectionInput, ReflectionProvider } from "./types";

export type FakeReflectionMode = "success" | "fail" | "invalid" | "slow";

/** Provider palsu untuk tes dan REFLECTION_PROVIDER=fake. Tidak ada panggilan jaringan. */
export class FakeReflectionProvider implements ReflectionProvider {
  /** Masukan yang pernah diterima, untuk pemeriksaan privasi di tes. */
  readonly calls: ReflectionInput[] = [];
  /** Jumlah panggilan yang sedang berjalan bersamaan dan puncaknya. */
  inFlight = 0;
  maxInFlight = 0;

  constructor(
    public mode: FakeReflectionMode = "success",
    /** Lama jeda mode "slow" (ms); selesai lebih awal bila di-abort. */
    public delayMs = 60_000,
  ) {}

  async generate(input: ReflectionInput, signal: AbortSignal): Promise<unknown> {
    this.calls.push(input);
    this.inFlight += 1;
    this.maxInFlight = Math.max(this.maxInFlight, this.inFlight);
    try {
      switch (this.mode) {
        case "fail":
          throw new Error("provider palsu gagal");
        case "invalid":
          return { source: "ai", summary: 42, insights: "bukan array" };
        case "slow":
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, this.delayMs);
            signal.addEventListener("abort", () => {
              clearTimeout(timer);
              reject(new Error("dibatalkan"));
            });
          });
        // lanjut ke hasil sukses bila tidak dibatalkan
        // eslint-disable-next-line no-fallthrough
        case "success":
          return {
            source: "ai",
            summary: "Kamu menjalani tahun ini dengan cukup seimbang.",
            insights: [
              {
                title: "Jaga bantalan Kekayaan",
                body: "Menyisihkan sedikit tiap bulan membantu saat ada Zonk.",
                reference: "The Psychology of Money, Morgan Housel",
              },
            ],
          };
      }
    } finally {
      this.inFlight -= 1;
    }
  }
}
