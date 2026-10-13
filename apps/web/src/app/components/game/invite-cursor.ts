/** Simpan kursor awal dan pion yang terakhir menguasai hover pada canvas. */
const cursors = new WeakMap<HTMLCanvasElement, { owner: object; previous: string }>();

export function showInviteCursor(canvas: HTMLCanvasElement, owner: object): void {
  const current = cursors.get(canvas);
  if (current) {
    current.owner = owner;
  } else {
    cursors.set(canvas, { owner, previous: canvas.style.cursor });
  }
  canvas.style.cursor = "pointer";
}

export function restoreInviteCursor(canvas: HTMLCanvasElement, owner: object): void {
  const current = cursors.get(canvas);
  if (!current || current.owner !== owner) return;
  canvas.style.cursor = current.previous;
  cursors.delete(canvas);
}