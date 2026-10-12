export type ServerConfig = {
  port: number;
  webOrigin: string;
  guestTokenSecret: string;
  version: string;
  trustProxy: boolean;
  /** Room waiting/finished tanpa aktivitas ini ditutup; room playing ditutup bila semua pemain putus selama ini. */
  roomIdleMs?: number;
  /** Room waiting/finished tanpa anggota tersambung selama ini ditutup. */
  roomEmptyMs?: number;
  /** Jeda animasi per pemain di Fase Pembalikan sebelum ronde berikutnya (ms). */
  revealStepMs?: number;
  /** Lama popup Ganti Bulan menunggu slider Bayar Hutang (detik). */
  monthPaySeconds?: number;
  /** Lama popup Ganti Bulan tampil bila tidak ada yang berhutang (ms). */
  monthSummaryOnlyMs?: number;
};

export const DEFAULT_ROOM_IDLE_MS = 600_000;
export const DEFAULT_ROOM_EMPTY_MS = 120_000;
export const DEFAULT_REVEAL_STEP_MS = 2_500;
export const DEFAULT_MONTH_PAY_SECONDS = 15;
export const DEFAULT_MONTH_SUMMARY_ONLY_MS = 3_000;

function readDuration(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} harus berupa integer milidetik lebih dari 0.`);
  }
  return parsed;
}

const PLACEHOLDER_SECRET = "change-me";

export function readServerConfig(
  env: NodeJS.ProcessEnv = process.env,
): ServerConfig {
  const guestTokenSecret = env.GUEST_TOKEN_SECRET ?? PLACEHOLDER_SECRET;

  if (env.NODE_ENV === "production") {
    if (
      !guestTokenSecret ||
      guestTokenSecret === PLACEHOLDER_SECRET ||
      guestTokenSecret.length < 32
    ) {
      throw new Error(
        "GUEST_TOKEN_SECRET wajib diisi (bukan placeholder) dengan minimal 32 karakter saat production.",
      );
    }
  }

  const port = Number(env.PORT ?? 3002);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error("PORT harus berupa integer antara 0 dan 65535.");
  }

  return {
    port,
    webOrigin: env.WEB_ORIGIN ?? "http://localhost:3000",
    guestTokenSecret,
    version: env.npm_package_version ?? "0.0.0",
    trustProxy: env.TRUST_PROXY === "true",
    roomIdleMs: readDuration(env.ROOM_IDLE_MS, DEFAULT_ROOM_IDLE_MS, "ROOM_IDLE_MS"),
    roomEmptyMs: readDuration(env.ROOM_EMPTY_MS, DEFAULT_ROOM_EMPTY_MS, "ROOM_EMPTY_MS"),
    revealStepMs: readDuration(env.REVEAL_STEP_MS, DEFAULT_REVEAL_STEP_MS, "REVEAL_STEP_MS"),
    monthPaySeconds: readDuration(
      env.MONTH_PAY_SECONDS,
      DEFAULT_MONTH_PAY_SECONDS,
      "MONTH_PAY_SECONDS",
    ),
    monthSummaryOnlyMs: readDuration(
      env.MONTH_SUMMARY_ONLY_MS,
      DEFAULT_MONTH_SUMMARY_ONLY_MS,
      "MONTH_SUMMARY_ONLY_MS",
    ),
  };
}