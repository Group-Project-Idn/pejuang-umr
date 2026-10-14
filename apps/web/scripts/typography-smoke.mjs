import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const profile = await mkdtemp(join(tmpdir(), "pejuang-font-smoke-"));
const html = await readFile(join(root, ".next/server/app/index.html"), "utf8");
const probe = `<script>(async () => {
  const heading = document.querySelector('main h1');
  const stamp = document.createElement('span');
  stamp.className = 'ui-stamp'; stamp.textContent = 'STEMPEL';
  const number = document.createElement('span');
  number.className = 'type-number'; number.textContent = 'Rp5.730.000';
  document.body.append(stamp, number);
  await document.fonts.ready;
  const family = (element) => getComputedStyle(element).fontFamily;
  const fonts = [family(heading), family(document.body), family(stamp), family(number)];
  await Promise.all(['Fredoka', 'Nunito', 'Kalam'].map(name => document.fonts.load('700 24px ' + name)));
  const canvas = document.createElement('canvas').getContext('2d');
  canvas.font = '700 24px Nunito';
  const widths = [...'0123456789'].map(digit => canvas.measureText(digit).width);
  document.body.dataset.typography = JSON.stringify({
    fonts, loaded: ['Fredoka', 'Nunito', 'Kalam'].map(name => document.fonts.check('700 24px ' + name)),
    numericVariant: getComputedStyle(number).fontVariantNumeric,
    widths,
    overflow: document.documentElement.scrollWidth > innerWidth,
  });
})().catch(error => { document.body.dataset.typography = JSON.stringify({ error: String(error) }); });</script>`;

const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    if (pathname === "/") {
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(html.replace("</body>", `${probe}</body>`));
      return;
    }
    if (!pathname.startsWith("/_next/static/")) { response.writeHead(404).end(); return; }
    const asset = pathname.slice("/_next/static/".length);
    if (asset.split("/").includes("..")) { response.writeHead(400).end(); return; }
    const file = join(root, ".next/static", asset);
    response.setHeader("content-type", file.endsWith(".css") ? "text/css" : file.endsWith(".woff2") ? "font/woff2" : "application/javascript");
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const address = server.address();
const chrome = spawn(process.env.CHROME_BIN ?? "/usr/bin/google-chrome", [
  "--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
  "--virtual-time-budget=10000", `--user-data-dir=${profile}`, "--dump-dom",
  `http://127.0.0.1:${address.port}/`,
], { stdio: ["ignore", "pipe", "pipe"] });
let output = "";
let stderr = "";
chrome.stdout.on("data", (chunk) => { output += chunk; });
chrome.stderr.on("data", (chunk) => { stderr = (stderr + chunk).slice(-2000); });
const timeout = setTimeout(() => chrome.kill("SIGKILL"), 25000);
try {
  const exit = await new Promise((done, fail) => {
    chrome.once("error", fail);
    chrome.once("close", done);
  });
  if (exit !== 0) throw new Error(`Chrome exited ${exit}: ${stderr}`);
  const encoded = output.match(/data-typography="([^"]+)"/)?.[1];
  if (!encoded) throw new Error(`No font measurements in browser output: ${stderr}`);
  const measured = JSON.parse(encoded.replaceAll("&quot;", '"').replaceAll("&amp;", "&"));
  if (measured.error) throw new Error(measured.error);
  for (const [index, expected] of ["Fredoka", "Nunito", "Kalam", "Nunito"].entries()) {
    if (!measured.fonts[index]?.includes(expected) || !measured.loaded[index < 3 ? index : 1]) {
      throw new Error(`Font ${expected} not rendered: ${JSON.stringify(measured)}`);
    }
  }
  if (measured.numericVariant !== "tabular-nums" || !measured.widths.every(width => Math.abs(width - measured.widths[0]) < 0.01) || measured.overflow) {
    throw new Error(`Numeric font or layout check failed: ${JSON.stringify(measured)}`);
  }
  console.log("Rendered fonts and tabular digits verified in Chromium.");
} finally {
  clearTimeout(timeout);
  if (chrome.exitCode === null && chrome.signalCode === null) chrome.kill("SIGKILL");
  await new Promise((done) => server.close(done));
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}