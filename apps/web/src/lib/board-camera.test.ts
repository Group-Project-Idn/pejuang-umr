import { describe, expect, it } from "vitest";
import { canZoomBoard, stepBoardDistance } from "./board-camera";

describe("zoom kamera papan", () => {
  it("memperbesar mengurangi jarak, memperkecil menambah jarak", () => {
    expect(stepBoardDistance(16, "in")).toBe(14);
    expect(stepBoardDistance(16, "out")).toBe(18);
  });

  it("tetap di rentang 10 sampai 22", () => {
    expect(stepBoardDistance(11, "in")).toBe(10);
    expect(stepBoardDistance(21, "out")).toBe(22);
    expect(stepBoardDistance(30, "in")).toBe(22);
    expect(stepBoardDistance(4, "out")).toBe(10);
  });

  it("menonaktifkan tombol di batas", () => {
    expect(canZoomBoard(10, "in")).toBe(false);
    expect(canZoomBoard(10, "out")).toBe(true);
    expect(canZoomBoard(22, "out")).toBe(false);
    expect(canZoomBoard(22, "in")).toBe(true);
  });
});
