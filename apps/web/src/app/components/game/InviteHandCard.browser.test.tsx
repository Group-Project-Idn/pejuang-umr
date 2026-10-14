import { createServer } from "node:http";
import { accessSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import StatusPanel from "./StatusPanel";
import { InviteHandCard } from "./invites";
import { measureViewport } from "./browser-viewport";

const chrome = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]
  .find((binary) => { try { accessSync(binary); return true; } catch { return false; } });

describe.skipIf(!chrome && !process.env.CI)("Kartu Ajakan selalu terlihat di HUD", () => {
  it("kartu tetap berada dalam layout di mobile dan desktop", async () => {
    const css = readFileSync(resolve("src/app/globals.css"), "utf8");
    const invite = renderToStaticMarkup(<InviteHandCard
      card={{ cardId: "c1", plan: "hangout", planEffects: [{ stat: "stress", delta: -2 }], motive: "sincere", expiresAtMonth: 2 }}
      playable={false} selected={false} unavailableReason="Bisa dimainkan saat giliranmu." onSelect={() => {}}
    />);
    const status = renderToStaticMarkup(<StatusPanel status={null} />);
    const server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>
        <body><main class="game-page"><div class="game-shell"><div class="game-layout">
          <div class="personal-hud">${invite}${status}</div>
          <section class="board-stage"><div class="board-canvas"></div></section><aside class="scoreboard ui-folder">Papan Skor</aside>
        </div></div></main><script>
          const card = document.querySelector('.invite-hand-card');
          const board = document.querySelector('.board-stage');
          const status = document.querySelector('.status-panel');
          const scoreboard = document.querySelector('.scoreboard');
          const c = card.getBoundingClientRect(); const b = board.getBoundingClientRect();
          const s = status.getBoundingClientRect(); const r = scoreboard.getBoundingClientRect();
          document.body.dataset.result = JSON.stringify({
            viewportWidth: innerWidth, viewportHeight: innerHeight,
            horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
            cardVisible: c.width > 0 && c.height > 0 && getComputedStyle(card).display !== 'none',
            cardBeforeBoard: innerWidth <= 760 ? c.bottom <= b.top : c.right <= b.left,
            controlsAccessible: card.querySelector('button')?.disabled === true,
            statusAfterBoard: innerWidth > 760 || (s.top >= b.bottom && r.top >= b.bottom),
            statusInViewport: innerWidth > 760 || (s.left >= 0 && r.right <= innerWidth),
          });
        </script></body></html>`);
    });
    await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Browser test server unavailable");
      if (!chrome) throw new Error("Chromium diperlukan untuk tes responsif (install chromium/google-chrome).");
      for (const width of [320, 375, 390, 760, 761, 768, 900, 1440]) {
        const { viewportWidth, viewportHeight, ...checks } = await measureViewport(chrome, `http://127.0.0.1:${address.port}/`, width);
        expect(viewportWidth).toBe(width);
        expect(viewportHeight).toBe(900);
        expect(checks, `viewport ${width}`).toEqual({
          horizontalOverflow: false, cardVisible: true, cardBeforeBoard: true,
          controlsAccessible: true, statusAfterBoard: true, statusInViewport: true,
        });
      }
    } finally {
      await new Promise<void>((done) => server.close(() => done()));
    }
  }, 60_000);
});