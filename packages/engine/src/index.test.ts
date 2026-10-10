import { describe, it, expect } from "vitest";
import { ENGINE_VERSION } from "./index";

describe("engine", () => {
  it("punya versi", () => {
    expect(ENGINE_VERSION).toBe("0.0.1");
  });
});
