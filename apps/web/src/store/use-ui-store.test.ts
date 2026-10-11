import { beforeEach, describe, expect, it } from "vitest";
import { useUiStore } from "./use-ui-store";

beforeEach(() => {
  useUiStore.getState().resetPreferences();
});

describe("useUiStore", () => {
  it("memakai nilai default yang aman", () => {
    const state = useUiStore.getState();
    expect(state.reduceMotion).toBe(false);
    expect(state.contrastBoost).toBe(false);
    expect(state.haptics).toBe(true);
  });

  it("bisa mengubah sebagian preferensi", () => {
    useUiStore.getState().setPreferences({ reduceMotion: true });
    const state = useUiStore.getState();
    expect(state.reduceMotion).toBe(true);
    expect(state.haptics).toBe(true);
  });

  it("bisa mengembalikan ke default", () => {
    useUiStore.getState().setPreferences({ haptics: false, contrastBoost: true });
    useUiStore.getState().resetPreferences();
    const state = useUiStore.getState();
    expect(state.haptics).toBe(true);
    expect(state.contrastBoost).toBe(false);
  });
});
