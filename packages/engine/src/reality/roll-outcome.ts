import type { Outcome } from "@pejuang/shared";
import type { RandomSource } from "../random";

/** GDD 4.4 dan 4.5: Peluang Hoki tetap 10% di semua petak. */
const LUCKY_PCT = 10;

/**
 * Resolusi angka acak: `random.integer` menghasilkan bilangan bulat, jadi angka
 * acak r di [0, 100) dibentuk dari 1000 langkah per poin persen.
 */
const ROLL_DECIMALS = 1_000;
const ROLL_MAX_STEP = 100 * ROLL_DECIMALS - 1;

/**
 * Menentukan jenis hasil Realita dari Peluang Zonk (GDD 4.4 langkah 1 dan 4.5).
 *
 * Angka acak r di [0, 100): r < zonkPct -> "zonk", r < zonkPct + 10 -> "lucky",
 * sisanya "safe". Peluang Hoki tetap 10% apa pun petaknya, jadi Zonk yang naik
 * selalu mengambil dari porsi Aman.
 */
export function rollOutcome(zonkPct: number, random: RandomSource): Outcome {
  const roll = random.integer(0, ROLL_MAX_STEP) / ROLL_DECIMALS;

  if (roll < zonkPct) {
    return "zonk";
  }
  if (roll < zonkPct + LUCKY_PCT) {
    return "lucky";
  }
  return "safe";
}
