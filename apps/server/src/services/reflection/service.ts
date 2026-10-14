import { ReflectionSchema, type Reflection } from "@pejuang/shared";
import type { ReflectionInput, ReflectionProvider } from "./types";

export const DEFAULT_REFLECTION_TIMEOUT_MS = 15_000;
export const DEFAULT_REFLECTION_MAX_CONCURRENT = 4;

export interface ReflectionServiceOptions {
  /** null = tanpa provider: selalu memakai cadangan berbasis aturan. */
  provider: ReflectionProvider | null;
  timeoutMs?: number;
  maxConcurrent?: number;
  /** Pencatat error; hanya menerima jenis kegagalan, tidak pernah data pemain. */
  log?: (message: string) => void;
}

/**
 * Layanan Refleksi (GDD 6.5 v1.12, D4). Cadangan berbasis aturan dihitung lebih dulu oleh
 * pemanggil; provider (LLM) hanya menggantinya bila berhasil, valid, dan tepat waktu.
 */
export class ReflectionService {
  private readonly provider: ReflectionProvider | null;
  private readonly timeoutMs: number;
  private readonly maxConcurrent: number;
  private readonly log: (message: string) => void;
  private running = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(options: ReflectionServiceOptions) {
    this.provider = options.provider;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_REFLECTION_TIMEOUT_MS;
    this.maxConcurrent = Math.max(1, options.maxConcurrent ?? DEFAULT_REFLECTION_MAX_CONCURRENT);
    this.log = options.log ?? ((message) => console.error(message));
  }

  get hasProvider(): boolean {
    return this.provider !== null;
  }

  /** Mengembalikan refleksi AI bila berhasil; selain itu `fallback` (source "rules"). */
  async create(input: ReflectionInput, fallback: Reflection): Promise<Reflection> {
    if (!this.provider) return fallback;
    await this.acquire();
    try {
      return await this.callProvider(this.provider, input, fallback);
    } finally {
      this.release();
    }
  }

  private async callProvider(
    provider: ReflectionProvider,
    input: ReflectionInput,
    fallback: Reflection,
  ): Promise<Reflection> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => resolve("timeout"), this.timeoutMs);
    });
    const call = provider.generate(input, controller.signal).then(
      (value) => ({ value }) as const,
      (error: unknown) => ({ error }) as const,
    );
    try {
      const outcome = await Promise.race([call, timeout]);
      if (outcome === "timeout") {
        controller.abort();
        this.log("[reflection] provider melewati batas waktu, memakai cadangan aturan");
        return fallback;
      }
      if ("error" in outcome) {
        // Never print an exception's name/message from untrusted HTTP/provider code.
        const rawName = outcome.error instanceof Error ? outcome.error.name : "";
        const name = ["GeminiConfigurationError", "GeminiNetworkError", "GeminiAbortError",
          "GeminiHttpError", "GeminiOutputError"].includes(rawName) ? rawName : "ProviderError";
        this.log(`[reflection] provider gagal (${name}), memakai cadangan aturan`);
        return fallback;
      }
      const parsed = ReflectionSchema.safeParse(outcome.value);
      if (!parsed.success) {
        this.log("[reflection] keluaran provider tidak valid, memakai cadangan aturan");
        return fallback;
      }
      return { ...parsed.data, source: "ai" };
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  private acquire(): Promise<void> {
    if (this.running < this.maxConcurrent) {
      this.running += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.waiting.push(() => resolve()));
  }

  private release(): void {
    const next = this.waiting.shift();
    if (next) next(); // slot langsung dipindahkan ke antrean berikutnya
    else this.running -= 1;
  }
}
