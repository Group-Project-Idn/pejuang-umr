import { describe, expect, it } from "vitest";
import { canShowDevFinish, getDevFinishMessage } from "./dev-tools";

const base = { roomCode: "UMR-0099", devToolsFlag: "true", hostId: "p1", playerId: "p1" };

describe("canShowDevFinish", () => {
  it("shows for the host of the dev room with the flag on", () => {
    expect(canShowDevFinish(base)).toBe(true);
  });
  it("hides in other rooms", () => {
    expect(canShowDevFinish({ ...base, roomCode: "UMR-1234" })).toBe(false);
    expect(canShowDevFinish({ ...base, roomCode: null })).toBe(false);
  });
  it("hides unless the flag is exactly true", () => {
    expect(canShowDevFinish({ ...base, devToolsFlag: "false" })).toBe(false);
    expect(canShowDevFinish({ ...base, devToolsFlag: undefined })).toBe(false);
    expect(canShowDevFinish({ ...base, devToolsFlag: "TRUE" })).toBe(false);
  });
  it("hides for non-host and unknown players", () => {
    expect(canShowDevFinish({ ...base, playerId: "p2" })).toBe(false);
    expect(canShowDevFinish({ ...base, playerId: null })).toBe(false);
    expect(canShowDevFinish({ ...base, hostId: undefined, playerId: undefined })).toBe(false);
  });
});

describe("getDevFinishMessage", () => {
  it("explains rejections in Indonesian", () => {
    expect(getDevFinishMessage("NOT_HOST")).toContain("host");
    expect(getDevFinishMessage("INTERNAL")).toContain("tidak merespons");
    expect(getDevFinishMessage("X")).toContain("X");
  });
});
