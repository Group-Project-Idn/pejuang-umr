import { describe, expect, it } from "vitest";
import {
  GuestNameSchema,
  GuestRequestSchema,
  HexCoordSchema,
  RoomJoinRequestSchema,
  RoomAvatarRequestSchema,
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
      GuestRequestSchema.parse({ name: "Raka", avatarId: "raka" }),
    ).toEqual({ name: "Raka", avatarId: "raka" });
    expect(
      GuestRequestSchema.safeParse({ name: "Raka", avatarId: "avatar-01" }).success,
    ).toBe(false);
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

  it("memvalidasi payload room dengan contract yang sama", () => {
    const requestId = "00000000-0000-4000-8000-000000000000";
    expect(
      RoomJoinRequestSchema.parse({ requestId, roomCode: "UMR-1234" }),
    ).toEqual({ requestId, roomCode: "UMR-1234" });
    expect(
      RoomAvatarRequestSchema.safeParse({ requestId, avatarId: "invalid" }).success,
    ).toBe(false);
  });
});
