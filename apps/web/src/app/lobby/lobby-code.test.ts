import { describe, expect, it } from "vitest";
import { RoomCodeSchema } from "@pejuang/shared";

describe("aturan kode lobby", () => {
  it("menerima format UMR-1234", () => {
    expect(RoomCodeSchema.safeParse("UMR-1234").success).toBe(true);
  });

  it("menolak format selain UMR-1234", () => {
    expect(RoomCodeSchema.safeParse("ABC-1").success).toBe(false);
    expect(RoomCodeSchema.safeParse("umr-1234").success).toBe(false);
  });
});
