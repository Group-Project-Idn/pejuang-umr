import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { accessSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CalendarCard from "./CalendarCard";
import StatusPanel from "./StatusPanel";

const chrome = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]
  .find((binary) => { try { accessSync(binary); return true; } catch { return false; } });

describe.skipIf(!chrome)("kalender dan legenda responsif di Chromium", () => {
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
      for (const width of [360, 390, 760, 768, 900, 1023, 1024, 1440]) {
        const html = await new Promise<string>((done, fail) => {
          const child = spawn(chrome!, ["--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
            "--no-first-run", `--window-size=${width},900`, "--dump-dom", `http://127.0.0.1:${address.port}/`]);
          let output = "";
          child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
          child.stderr.resume();
          child.on("error", fail);
          child.on("close", (code) => code === 0 ? done(output) : fail(new Error(`Chrome exited ${code}`)));
        });
        const result = html.match(/data-result="([^"]+)"/);
        expect(result, html.slice(0, 500)).not.toBeNull();
        const measured = JSON.parse(result![1].replaceAll("&quot;", '"')) as Record<string, unknown>;
        const { positions, ...checks } = measured;
        expect(checks, `viewport ${width}: ${JSON.stringify(positions)}`).toEqual({
          complete: true, below: true, seasonAfterDate: true, inside: true, headerClear: true, footerClear: true,
          legendVisible: true, horizontalOverflow: false,
        });
      }
    } finally {
      server.close();
    }
  }, 20_000);
});