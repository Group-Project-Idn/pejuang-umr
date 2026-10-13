import { describe, expect, it } from "vitest";
import { restoreInviteCursor, showInviteCursor } from "./invite-cursor";

describe("kursor hover pion Ajakan", () => {
  it("mengembalikan kursor awal saat hover diakhiri", () => {
    const canvas = { style: { cursor: "crosshair" } } as HTMLCanvasElement;
    const owner = {};
    showInviteCursor(canvas, owner);
    expect(canvas.style.cursor).toBe("pointer");
    restoreInviteCursor(canvas, owner);
    expect(canvas.style.cursor).toBe("crosshair");
  });

  it("tidak memulihkan kursor milik pion lain ketika hover berpindah", () => {
    const canvas = { style: { cursor: "grab" } } as HTMLCanvasElement;
    const first = {};
    const second = {};
    showInviteCursor(canvas, first);
    showInviteCursor(canvas, second);
    restoreInviteCursor(canvas, first);
    expect(canvas.style.cursor).toBe("pointer");
    restoreInviteCursor(canvas, second);
    expect(canvas.style.cursor).toBe("grab");
  });
});