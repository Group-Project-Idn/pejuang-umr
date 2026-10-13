import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { accessSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "esbuild";
import { describe, expect, it } from "vitest";

const chrome = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]
  .find((binary) => { try { accessSync(binary); return true; } catch { return false; } });

describe.skipIf(!chrome)("memilih target Ajakan di browser", () => {
  it("memilih ID target lewat klik tombol dan membatalkan mode pilih", async () => {
    const source = `
      import React, { useState } from "react";
      import { createRoot } from "react-dom/client";
      import Scoreboard from "./Scoreboard";
      import { InvitePickBanner } from "../game-v2/invites";

      const game = { scores: [
        { playerId: "p1", rank: 1, provisionalScore: 100, eliminated: false },
        { playerId: "p2", rank: 2, provisionalScore: 80, eliminated: false },
        { playerId: "p3", rank: 3, provisionalScore: 50, eliminated: true },
      ], activePlayerId: "p1", gold: null };
      const room = { players: [
        { playerId: "p1", name: "Rina", avatarId: "sinta" },
        { playerId: "p2", name: "Dika", avatarId: "raka" },
        { playerId: "p3", name: "Budi", avatarId: "michael" },
      ] };
      const selected = [];
      function App() {
        const [picking, setPicking] = useState(true);
        return <>
          {picking && <InvitePickBanner onCancel={() => setPicking(false)} />}
          <Scoreboard game={game} room={room} playerId="p1"
            pickTarget={picking ? { disabledIds: ["p1", "p3"], onSelect: (id) => selected.push(id) } : null} />
        </>;
      }
      createRoot(document.getElementById("app")).render(<App />);
      const failures = [];
      const check = (condition, message) => { if (!condition) failures.push(message); };
      const wait = (ms) => new Promise((done) => setTimeout(done, ms));
      async function run() {
        await wait(150);
        const target = document.querySelector('[aria-label="Ajak Dika"]');
        check(!!target, "target tidak muncul sebagai tombol");
        check(!document.querySelector('[aria-label="Ajak Rina"]'), "diri sendiri selectable");
        check(!document.querySelector('[aria-label="Ajak Budi"]'), "pemain eliminasi selectable");
        target.focus();
        check(document.activeElement === target && target.tabIndex === 0, "tombol target tidak bisa difokuskan");
        target.click();
        check(selected.join() === "p2", "klik gagal memilih ID p2");
        const cancel = document.querySelector(".invite-pick-banner button");
        check(!!cancel, "tombol Batal tidak ada");
        cancel.click();
        await wait(50);
        check(!document.querySelector(".invite-pick-banner"), "Batal tidak keluar dari mode pilih");
        check(!document.querySelector(".invite-score-button"), "tombol target tetap aktif sesudah Batal");
        document.body.dataset.result = JSON.stringify(failures);
      }
      run().catch((error) => { document.body.dataset.result = JSON.stringify([String(error)]); });
    `;
    const bundle = await build({
      stdin: { contents: source, resolveDir: resolve("src/app/components/game"), sourcefile: "invite-pick-browser.tsx", loader: "tsx" },
      bundle: true, write: false, format: "iife", platform: "browser", logLevel: "silent",
      plugins: [{ name: "next-image-stub", setup(plugin) {
        plugin.onResolve({ filter: /^next\/image$/ }, () => ({ path: "next-image", namespace: "stub" }));
        plugin.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: 'import React from "react"; export default function Image(props) { return React.createElement("img", props); }', loader: "js", resolveDir: resolve("src/app/components/game") }));
        plugin.onResolve({ filter: /^@\// }, (args) => ({
          path: resolve("src", args.path.slice(2) + ".ts"),
        }));
      } }],
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