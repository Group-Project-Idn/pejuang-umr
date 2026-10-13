import type { OpenedHex, TileOption } from "@pejuang/shared";
import { resolveHexClick, type HexDetailView } from "./hex-detail";

/** Pergeseran pointer (piksel) di atas ini dianggap seret kamera, bukan klik. */
export const CLICK_DRAG_THRESHOLD_PX = 6;

type Point = { x: number; y: number };

export function isDragGesture(
  down: Point | null,
  up: Point,
  threshold = CLICK_DRAG_THRESHOLD_PX,
): boolean {
  if (!down) return false;
  return Math.hypot(up.x - down.x, up.y - down.y) > threshold;
}

/** Pemetaan instanceId litMesh ke heksa menyala; di luar daftar mengembalikan null. */
export function litInstanceToKey(
  instanceId: number | undefined,
  lit: readonly Pick<TileOption, "hex">[],
): string | null {
  if (instanceId === undefined) return null;
  const option = lit[instanceId];
  return option ? `${option.hex.q},${option.hex.r}` : null;
}

/** Klik heksa: abaikan bila bergeser; kunci lain mengganti isi panel. */
export function selectHexFromClick(
  key: string,
  dragged: boolean,
  lit: readonly TileOption[],
  opened: readonly OpenedHex[],
): HexDetailView | null {
  if (dragged) return null;
  return resolveHexClick(key, lit, opened);
}

/**
 * Panel non-modal: lapisan luar tidak menangkap pointer, hanya kartu.
 * HP: lembar bawah (maks ~70vh). Desktop (≥768px): di kolom kanan game-shell, menutupi Papan Skor.
 */
export const HEX_PANEL_MOBILE_MAX_HEIGHT = "70vh";
export const HEX_PANEL_WRAPPER_CLASS =
  "pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center p-3 md:absolute md:inset-x-auto md:bottom-4 md:right-5 md:top-[105px] md:justify-end md:p-0";
export const HEX_PANEL_CLASS =
  "paper-panel hex-card pointer-events-auto flex w-full max-w-md max-h-[70vh] flex-col md:max-h-full md:w-[300px] md:max-w-none";

/** Cadangan daftar tombol heksa bila pemain punya giliran tetapi tak ada heksa menyala tergambar. */
export function shouldShowHexFallback(input: {
  webgl: boolean | null;
  boardReady: boolean;
  boardFailed: boolean;
  litCount: number;
  renderedLitCount: number;
}): boolean {
  if (input.webgl !== true || input.litCount === 0) return false;
  if (input.boardFailed) return true;
  return input.boardReady && input.renderedLitCount < input.litCount;
}
