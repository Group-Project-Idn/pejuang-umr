import { act } from "react";
import { describe, expect, it } from "vitest";
import { useUiStore } from "./use-ui-store";

describe("ui store", () => {
  it("membuka dan menutup sheet beserta heksa terpilih", () => {
    act(() => {
      useUiStore.getState().openSheet("hexDetail", "0,0");
    });
    expect(useUiStore.getState().activeSheet).toBe("hexDetail");
    expect(useUiStore.getState().selectedHex).toBe("0,0");
    act(() => {
      useUiStore.getState().closeSheet();
    });
    expect(useUiStore.getState().activeSheet).toBeNull();
    expect(useUiStore.getState().selectedHex).toBeNull();
  });

  it("menyimpan preferensi kurangi gerakan", () => {
    act(() => {
      useUiStore.getState().setReduceMotion(true);
    });
    expect(useUiStore.getState().reduceMotion).toBe(true);
    act(() => {
      useUiStore.getState().setReduceMotion(false);
    });
    expect(useUiStore.getState().reduceMotion).toBe(false);
  });
});
