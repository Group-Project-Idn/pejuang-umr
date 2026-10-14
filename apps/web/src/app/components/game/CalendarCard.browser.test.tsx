import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:http";
import { accessSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CalendarCard from "./CalendarCard";
import StatusPanel from "./StatusPanel";

const chrome = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]
  .find((binary) => { try { accessSync(binary); return true; } catch { return false; } });

const BROWSER_TIMEOUT_MS = 20_000;

async function measureInChrome(url: string, width: number): Promise<Record<string, unknown>> {
  if (!chrome) throw new Error("Chromium diperlukan untuk tes responsif (install chromium/google-chrome).");
  const profile = mkdtempSync(join(tmpdir(), "pejuang-calendar-"));
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
    child.stderr?.on("data", (chunk: Buffer) => {
      browserError = (browserError + chunk.toString()).slice(-2_000);
    });
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
      stage = "open CDP target";
      const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
      if (!target.ok) throw new Error(`Chrome CDP target failed: ${target.status}`);
      const { webSocketDebuggerUrl } = await target.json() as { webSocketDebuggerUrl: string };
      socket = new WebSocket(webSocketDebuggerUrl);
      stage = "connect CDP WebSocket";
      await new Promise<void>((done, fail) => {
        socket!.addEventListener("open", () => done(), { once: true });
        socket!.addEventListener("error", () => fail(new Error("Chrome CDP connection failed")), { once: true });
      });
      let nextId = 0;
      function command(method: string, params: Record<string, unknown> = {}): Promise<{
        result?: { value?: string };
      }> {
        const id = ++nextId;
        return new Promise((done, fail) => {
          const onMessage = (event: MessageEvent) => {
            const reply = JSON.parse(String(event.data)) as {
              id?: number;
              error?: unknown;
              result: { result?: { value?: string } };
            };
            if (reply.id !== id) return;
            socket!.removeEventListener("message", onMessage);
            if (reply.error) fail(new Error(`Chrome CDP ${method} failed`));
            else done(reply.result);
          };
          socket!.addEventListener("message", onMessage);
          socket!.send(JSON.stringify({ id, method, params }));
        });
      }
      stage = "set viewport";
      await command("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: true });
      stage = "navigate test page";
      await command("Page.navigate", { url });
      stage = "wait for layout measurements";
      for (;;) {
        const reply = await command("Runtime.evaluate", {
          expression: "document.body?.dataset.result ?? null", returnByValue: true,
        });
        if (reply.result?.value) return JSON.parse(reply.result.value) as Record<string, unknown>;
        await new Promise((done) => setTimeout(done, 30));
      }
    })();
    return await Promise.race([work, exited, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error(
        `Chrome timeout at viewport ${width} while ${stage}${browserError ? `; Chromium stderr: ${browserError}` : ""}`,
      )), BROWSER_TIMEOUT_MS);
    })]);
  } finally {
    if (timer) clearTimeout(timer);
    socket?.close();
    if (child) {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      await closed;
    }
    // Chromium can still write to the profile briefly after the main process exits.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        rmSync(profile, { recursive: true, force: true });
        break;
      } catch (error) {
        if (attempt === 2 || !(error instanceof Error) || error.message.includes("ENOTEMPTY") === false) throw error;
        await new Promise((done) => setTimeout(done, 100));
      }
    }
  }
}

describe.skipIf(!chrome && !process.env.CI)("kalender dan legenda responsif di Chromium", () => {
  it("menempatkan hint utuh di bawah nama musim dan menjaga Kamus Petak terlihat", async () => {
    const calendar = renderToStaticMarkup(<CalendarCard calendar={{
      step: 8, totalSteps: 24, round: 4, month: 4,
      dateLabel: "April · Pekan 2", season: "transition",
      seasonHint: "Pancaroba: petak Kesehatan lebih rawan; keterangan panjang tetap terbaca sampai selesai",
      nextEvent: null,
    }} />);
    const legend = renderToStaticMarkup(<StatusPanel status={null} />);
    const css = readFileSync(resolve("src/app/globals.css"), "utf8");
    const server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>
        <body><main class="game-page"><div class="game-shell"><header class="top-hud">${calendar}<div class="mission-card">Misi berikutnya</div></header>
        <div class="game-layout"><section class="board-stage"><div class="board-canvas"></div></section>${legend}<aside class="scoreboard">Papan Skor</aside></div>
        <footer class="bottom-hud">Giliran</footer></div></main><script>
        const hint = document.querySelector('.season-hint');
        const name = document.querySelector('.weather-name');
        const date = document.querySelector('.calendar-date');
        const card = document.querySelector('.calendar-card');
        const legend = document.querySelector('.tile-legend');
        const mission = document.querySelector('.mission-card');
        const board = document.querySelector('.board-stage');
        const footer = document.querySelector('.bottom-hud');
        const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        const cardRect = card.getBoundingClientRect();
        const missionRect = mission.getBoundingClientRect();
        const boardRect = board.getBoundingClientRect();
        document.body.dataset.result = JSON.stringify({
          viewportWidth: innerWidth, viewportHeight: innerHeight,
          calendarColumns: getComputedStyle(card).gridTemplateColumns.split(' ').length,
          complete: hint.scrollHeight <= hint.clientHeight && hint.textContent.includes('sampai selesai'),
          below: hint.getBoundingClientRect().top >= name.getBoundingClientRect().bottom,
          seasonAfterDate: hint.getBoundingClientRect().top >= date.getBoundingClientRect().bottom ||
            hint.getBoundingClientRect().left >= date.getBoundingClientRect().right,
          inside: hint.getBoundingClientRect().bottom <= card.getBoundingClientRect().bottom,
          headerClear: !overlaps(cardRect, missionRect) &&
            boardRect.top >= Math.max(cardRect.bottom, missionRect.bottom),
          footerClear: innerWidth > 760 || !overlaps(footer.getBoundingClientRect(), legend.getBoundingClientRect()),
          positions: { cardBottom: cardRect.bottom, missionBottom: missionRect.bottom, boardTop: boardRect.top,
            overlap: overlaps(cardRect, missionRect) },
          legendVisible: getComputedStyle(legend).display !== 'none' && legend.getBoundingClientRect().width > 0,
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        });</script></body></html>`);
    });
    await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Browser test server unavailable");
      for (const width of [320, 360, 390, 760, 768, 900, 1023, 1024, 1440]) {
        const measured = await measureInChrome(`http://127.0.0.1:${address.port}/`, width);
        const { positions, viewportWidth, viewportHeight, calendarColumns, ...checks } = measured;
        expect(viewportWidth).toBe(width);
        expect(viewportHeight).toBe(900);
        expect(calendarColumns).toBe(width <= 400 ? 1 : 2);
        expect(checks, `viewport ${width}: ${JSON.stringify(positions)}`).toEqual({
          complete: true, below: true, seasonAfterDate: true, inside: true, headerClear: true, footerClear: true,
          legendVisible: true, horizontalOverflow: false,
        });
      }
    } finally {
      await new Promise<void>((done) => server.close(() => done()));
    }
  }, 90_000);
});