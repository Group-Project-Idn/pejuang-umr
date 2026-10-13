export const BOARD_MIN_DISTANCE = 10;
export const BOARD_MAX_DISTANCE = 22;
export const BOARD_ZOOM_STEP = 2;

export type BoardZoomDirection = "in" | "out";

/** Jarak kamera baru setelah satu langkah zoom, selalu dalam rentang min-max. */
export function stepBoardDistance(
  current: number,
  direction: BoardZoomDirection,
  step = BOARD_ZOOM_STEP,
  min = BOARD_MIN_DISTANCE,
  max = BOARD_MAX_DISTANCE,
): number {
  const next = direction === "in" ? current - step : current + step;
  return Math.min(max, Math.max(min, next));
}

export function canZoomBoard(
  current: number,
  direction: BoardZoomDirection,
  min = BOARD_MIN_DISTANCE,
  max = BOARD_MAX_DISTANCE,
): boolean {
  return direction === "in" ? current > min : current < max;
}
