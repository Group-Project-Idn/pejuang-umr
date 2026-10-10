import { describe, expect, it } from "vitest";
import {
  GuestNameSchema,
  GuestRequestSchema,
  HexCoordSchema,
  RequestIdSchema,
  RoomCodeSchema,
} from "../index";

describe("shared schemas", () => {
  it("menerima dan merapikan nama tamu yang valid", () => {
    expect(GuestNameSchema.parse("  Nick Zad  ")).toBe("Nick Zad");
    expect(GuestNameSchema.parse("O'Neil-7.")).toBe("O'Neil-7.");
  });

  it("menolak nama tamu yang tidak valid", () => {
    expect(GuestNameSchema.safeParse("A").success).toBe(false);
    expect(GuestNameSchema.safeParse("nama<script>").success).toBe(false);
  });

  it("memvalidasi request guest", () => {
    expect(
      GuestRequestSchema.parse({ name: "Raka", avatarId: "avatar-01" }),
    ).toEqual({ name: "Raka", avatarId: "avatar-01" });
  });

  it("memvalidasi room code dan request id", () => {
    expect(RoomCodeSchema.safeParse("UMR-4821").success).toBe(true);
    expect(RoomCodeSchema.safeParse("umr-4821").success).toBe(false);
    expect(RequestIdSchema.safeParse(crypto.randomUUID()).success).toBe(true);
  });

  it("hanya menerima koordinat hex integer", () => {
    expect(HexCoordSchema.safeParse({ q: -2, r: 3 }).success).toBe(true);
    expect(HexCoordSchema.safeParse({ q: 1.5, r: 3 }).success).toBe(false);
  });
});