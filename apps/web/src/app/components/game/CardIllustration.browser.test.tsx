import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:http";
import { accessSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Category } from "@pejuang/shared";
import HexDetailSheet from "./HexDetailSheet";
import { buildLitDetail, buildOpenedDetail } from "@/lib/hex-detail";

const chrome = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]
  .find((binary) => { try { accessSync(binary); return true; } catch { return false; } });

type Measurement = {
  horizontalOverflow: boolean;
  illustrationHeight: number;
  illustrationWithinPanel: boolean;
  goldCentered: boolean;
  panelWithinViewport: boolean;
  controlsReachable: boolean;
  scrollNeeded: boolean;
  panelRect: { left: number; right: number; height: number; viewportHeight: number };
};

async function measureInChrome(url: string, width: number, height: number): Promise<Measurement> {
  if (!chrome) throw new Error("Chromium diperlukan untuk tes responsif.");
  const profile = mkdtempSync(join(tmpdir(), "pejuang-illustration-"));
  let child: ChildProcess | undefined;
  let closed: Promise<void> | undefined;
  let socket: WebSocket | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stage = "start Chromium";
  let browserError = "";
  try {
    child = spawn(chrome, ["--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
      "--no-first-run", "--remote-allow-origins=*", "--remote-debugging-port=0",
      `--user-data-dir=${profile}`, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
    child.stderr?.on("data", (chunk: Buffer) => { browserError = (browserError + chunk.toString()).slice(-2_000); });
    closed = new Promise((done) => child!.once("close", () => done()));
    const exited = new Promise<never>((_resolve, reject) => {
      child!.once("error", reject);
      child!.once("exit", (code) => reject(new Error(`Chrome exited ${code}`)));
    });
    const work = (async () => {
      let port: number | undefined;
      stage = "wait for DevToolsActivePort";
      while (port === undefined) {
        try {
          port = Number(readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]);
          if (!Number.isInteger(port) || port <= 0) throw new Error("Invalid CDP port");
        } catch { await new Promise((done) => setTimeout(done, 30)); }
      }
      stage = "connect CDP";
      const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
      if (!target.ok) throw new Error(`Chrome CDP target failed: ${target.status}`);
      const { webSocketDebuggerUrl } = await target.json() as { webSocketDebuggerUrl: string };
      socket = new WebSocket(webSocketDebuggerUrl);
      await new Promise<void>((done, fail) => {
        socket!.addEventListener("open", () => done(), { once: true });
        socket!.addEventListener("error", () => fail(new Error("Chrome CDP connection failed")), { once: true });
      });
      let nextId = 0;
      function command(method: string, params: Record<string, unknown> = {}): Promise<{ result?: { value?: string } }> {
        const id = ++nextId;
        return new Promise((done, fail) => {
          const onMessage = (event: MessageEvent) => {
            const reply = JSON.parse(String(event.data)) as {
              id?: number; error?: unknown; result: { result?: { value?: string } };
            };
            if (reply.id !== id) return;
            socket!.removeEventListener("message", onMessage);
            if (reply.error) fail(new Error(`Chrome CDP ${method} failed: ${JSON.stringify(reply.error)}`));
            else done(reply.result);
          };
          socket!.addEventListener("message", onMessage);
          socket!.send(JSON.stringify({ id, method, params }));
        });
      }
      stage = "set viewport";
      await command("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: true });
      stage = "navigate test page";
      await command("Page.navigate", { url });
      stage = "wait for layout measurements";
      for (;;) {
        const reply = await command("Runtime.evaluate", {
          expression: "document.body?.dataset.result ?? null", returnByValue: true,
        });
        if (reply.result?.value) return JSON.parse(reply.result.value) as Measurement;
        await new Promise((done) => setTimeout(done, 30));
      }
    })();
    return await Promise.race([work, exited, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error(
        `Chrome timeout at ${width}x${height} while ${stage}${browserError ? `; ${browserError}` : ""}`,
      )), 20_000);
    })]);
  } finally {
    if (timer) clearTimeout(timer);
    socket?.close();
    if (child) {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      await closed;
    }
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try { rmSync(profile, { recursive: true, force: true }); break; }
      catch (error) {
        if (attempt === 2 || !(error instanceof Error) || !error.message.includes("ENOTEMPTY")) throw error;
        await new Promise((done) => setTimeout(done, 100));
      }
    }
  }
}

function card(category: Category, opened: boolean): string {
  const common = {
    hex: { q: 1, r: 0 }, category,
    title: "Judul petak yang cukup panjang agar membungkus ke baris berikutnya di layar kecil",
    plan: [
      { stat: "wealth" as const, delta: -1_000_000 },
      { stat: "health" as const, delta: -1 },
      { stat: "stress" as const, delta: 1 },
    ],
  };
  const detail = opened
    ? buildOpenedDetail({ ...common, reality: category === "gold" ? null : {
      outcome: "zonk", text: "Realita panjang untuk memastikan teks tetap terbaca dan tombol Tutup bisa dicapai meskipun panel perlu digulir di layar kecil.",
      effects: [{ stat: "stress", delta: 2 }], seasonal: false,
    }, byPlayerId: "p1", step: 2 })
    : buildLitDetail({ ...common, risk: category === "gold" ? null : "high", riskTags: [], isGold: category === "gold" });
  return renderToStaticMarkup(<HexDetailSheet detail={detail} pending={false} onChoose={() => {}} onClose={() => {}} />);
}

describe.skipIf(!chrome && !process.env.CI)("ilustrasi Detail Heksa responsif di Chromium", () => {
  it("menjaga SVG dan tombol tetap di dalam panel yang dapat digulir", async () => {
    const css = readFileSync(resolve("src/app/globals.css"), "utf8");
    const server = createServer((request, response) => {
      const params = new URL(request.url ?? "/", "http://localhost").searchParams;
      const category = params.get("category") === "gold" ? "gold" : "work";
      const opened = params.get("opened") === "true";
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}
        /* Utility classes used by SidePanel/PopupFrame; the rest uses the real card CSS above. */
        .pointer-events-none { pointer-events: none } .pointer-events-auto { pointer-events: auto }
        .fixed { position: fixed } .inset-x-0 { left: 0; right: 0 } .bottom-0 { bottom: 0 }
        .z-30 { z-index: 30 } .flex { display: flex } .justify-center { justify-content: center }
        .p-3 { padding: 12px } .w-full { width: 100% } .max-w-md { max-width: 448px }
        .max-h-\\[70vh\\] { max-height: 70vh } .flex-col { flex-direction: column }
        .grid { display: grid } .gap-2 { gap: 8px } .flex-wrap { flex-wrap: wrap }
        @media(min-width:768px) { .md\\:absolute { position: absolute } .md\\:inset-x-auto { left: auto; right: auto }
          .md\\:bottom-4 { bottom: 16px } .md\\:right-5 { right: 20px } .md\\:top-\\[105px\\] { top: 105px }
          .md\\:justify-end { justify-content: flex-end } .md\\:p-0 { padding: 0 }
          .md\\:max-h-full { max-height: 100% } .md\\:w-\\[300px\\] { width: 300px }
          .md\\:max-w-none { max-width: none } }
      </style></head><body><div style="position:relative;min-height:100vh">${card(category, opened)}</div><script>
        const panel = document.querySelector('.hex-card');
        const scroll = panel.querySelector('.ui-popup-scroll');
        const illustration = panel.querySelector('.card-illustration');
        const controls = Array.from(panel.querySelectorAll('button'));
        const gold = panel.querySelector('.card-illustration-gold-icon svg');
        const panelRect = panel.getBoundingClientRect();
        const illustrationRect = illustration.getBoundingClientRect();
        const goldRect = gold?.getBoundingClientRect();
        const initialScrollHeight = scroll.scrollHeight;
        scroll.scrollTop = initialScrollHeight;
        document.body.dataset.result = JSON.stringify({
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
          illustrationHeight: Math.round(parseFloat(getComputedStyle(illustration).height)),
          illustrationWithinPanel: illustrationRect.width > 0 && illustrationRect.left >= panelRect.left && illustrationRect.right <= panelRect.right,
          goldCentered: !goldRect || Math.abs((goldRect.left + goldRect.right) / 2 - (illustrationRect.left + illustrationRect.right) / 2) < 2,
          panelWithinViewport: panel.offsetHeight <= (innerWidth < 768 ? innerHeight * .7 : innerHeight - 105) + 1 && panelRect.left >= 0 && panelRect.right <= innerWidth,
          panelRect: { left: panelRect.left, right: panelRect.right, height: panelRect.height, viewportHeight: innerHeight },
          controlsReachable: controls.length === ("${opened}" === "true" ? 1 : 2) && controls.every((button) => {
            const rect = button.getBoundingClientRect(); const bounds = scroll.getBoundingClientRect();
            return rect.height > 0 && rect.top >= bounds.top - 1 && rect.bottom <= bounds.bottom + 1;
          }),
          scrollNeeded: initialScrollHeight > scroll.clientHeight,
        });
      </script></body></html>`);
    });
    await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Browser test server unavailable");
      for (const [width, height] of [[320, 600], [375, 500], [390, 900], [768, 900], [900, 900]]) {
        for (const [category, opened] of [["work", true], ["gold", false]] as const) {
          const url = `http://127.0.0.1:${address.port}/?category=${category}&opened=${opened}`;
          const measured = await measureInChrome(url, width, height);
          expect(measured, `${category} ${width}x${height}: ${JSON.stringify(measured)}`).toMatchObject({
            horizontalOverflow: false, illustrationWithinPanel: true, goldCentered: true,
            panelWithinViewport: true, controlsReachable: true,
          });
          expect(measured.illustrationHeight).toBe(height <= 600 || width <= 639 ? 80 : 112);
          if (height <= 600) expect(measured.scrollNeeded).toBe(true);
        }
      }
    } finally {
      await new Promise<void>((done) => server.close(() => done()));
    }
  }, 90_000);
});