import { describe, expect, it, vi } from "vitest";
import { copyTextToClipboard } from "./clipboard";

describe("salin teks ke clipboard", () => {
  it("mengembalikan false jika Clipboard API tidak tersedia", async () => {
    await expect(copyTextToClipboard("UMR-1234", undefined)).resolves.toBe(false);
  });

  it("mengembalikan false jika izin clipboard ditolak", async () => {
    const clipboard = {
      writeText: vi.fn().mockRejectedValue(new Error("NotAllowedError")),
    };

    await expect(copyTextToClipboard("UMR-1234", clipboard)).resolves.toBe(false);
    expect(clipboard.writeText).toHaveBeenCalledWith("UMR-1234");
  });

  it("mengembalikan true setelah kode berhasil disalin", async () => {
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };

    await expect(copyTextToClipboard("UMR-1234", clipboard)).resolves.toBe(true);
  });
});