import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { accessSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "esbuild";
import { describe, expect, it } from "vitest";

const chrome = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]
  .find((binary) => { try { accessSync(binary); return true; } catch { return false; } });

describe("safe area dialog mobile", () => {
  it("menambah padding bawah pada area scroll di bawah breakpoint mobile", () => {
    const css = readFileSync(resolve("src/app/globals.css"), "utf8");
    const mobile = css.match(/@media \(max-width: 639px\) \{[^\n]+\}/)?.[0];
    expect(mobile).toMatch(/\.comic-dialog-card \.ui-popup-scroll\s*\{\s*padding-bottom:\s*calc\(20px \+ env\(safe-area-inset-bottom, 0px\)\)/);
  });
});

describe.skipIf(!chrome)("dialog Ganti Bulan di browser", () => {
  it("menjaga fokus slider dan tombol selama timer berjalan, serta menangani Escape dan pembukaan ulang", async () => {
    const source = `
      import React, { useState } from "react";
      import { createRoot } from "react-dom/client";
      import MonthChangeView from "./MonthChangeView";
      import BottomSheet from "../ui/BottomSheet";

      const status = { wealth: 100000, debt: 100000, debtLimit: 25000000, health: 7, stress: 2 };
      const summary = {
        month: 2, salary: 5730000, livingCost: 5200000, passiveStress: 1, interest: 30000,
        interestAddedToDebt: 0, before: status, after: status,
        batchId: "game-1-step3", deadline: Date.now() + 15000, payDebt: { max: 100000 },
      };
      const failures = [];
      const check = (condition, message) => { if (!condition) failures.push(message); };
      const wait = (ms) => new Promise((done) => setTimeout(done, ms));
      const root = createRoot(document.getElementById("app"));
      function App() {
        const [open, setOpen] = useState(true);
        const [version, setVersion] = useState(0);
        window.changeDialog = { setOpen, setVersion };
        return <>
          <MonthChangeView summary={summary} pending={false} expired={false} onPayDebt={() => {}} />
          <BottomSheet open={open} title="Tes Escape" onClose={() => { window.closedVersion = version; }}>Isi</BottomSheet>
        </>;
      }
      root.render(<App />);
      async function run() {
        await wait(200);
        const slider = document.getElementById("month-debt-amount");
        const button = document.querySelector(".comic-payment button[type=submit]");
        check(!!slider && !!button, "slider dan tombol pembayaran harus ada");
        if (slider && button) {
          slider.focus();
          await wait(600);
          check(document.activeElement === slider, "fokus slider hilang sesudah tick timer");
          button.focus();
          await wait(600);
          check(document.activeElement === button, "fokus tombol hilang sesudah tick timer");
        }
        window.changeDialog.setVersion(1);
        await wait(100);
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        check(window.closedVersion === 1, "Escape tidak menggunakan callback terbaru");
        window.changeDialog.setOpen(false);
        await wait(100);
        window.changeDialog.setOpen(true);
        await wait(100);
        check(document.activeElement?.textContent === "Tes Escape", "judul tidak difokuskan saat dibuka kembali");
        document.body.dataset.result = JSON.stringify(failures);
      }
      run().catch((error) => { document.body.dataset.result = JSON.stringify([String(error)]); });
    `;
    const bundle = await build({
      stdin: { contents: source, resolveDir: resolve("src/app/components/game"), sourcefile: "dialog-browser.tsx", loader: "tsx" },
      bundle: true, write: false, format: "iife", platform: "browser", logLevel: "silent",
    });
    const server = createServer((request, response) => {
      if (request.url === "/test.js") {
        response.writeHead(200, { "content-type": "text/javascript" });
        response.end(bundle.outputFiles[0].contents);
      } else {
        response.writeHead(200, { "content-type": "text/html" });
        response.end('<!doctype html><html><body><div id="app"></div><script src="/test.js"></script></body></html>');
      }
    });
    await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Browser test server unavailable");
      const html = await new Promise<string>((done, fail) => {
        const child = spawn(chrome!, [
          "--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
          "--no-first-run", "--virtual-time-budget=3000", "--dump-dom",
          `http://127.0.0.1:${address.port}/`,
        ]);
        let output = "";
        child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
        child.stderr.resume();
        child.on("error", fail);
        child.on("close", (code) => code === 0 ? done(output) : fail(new Error(`Chrome exited ${code}`)));
      });
      const result = html.match(/data-result="([^"]+)"/);
      expect(result, html.slice(0, 500)).not.toBeNull();
      expect(JSON.parse(result![1].replaceAll("&quot;", '"'))).toEqual([]);
    } finally {
      server.close();
    }
  }, 15_000);
});