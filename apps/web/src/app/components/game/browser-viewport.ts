import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Ukur halaman pada viewport yang benar-benar disetel lewat CDP, bukan --window-size. */
export async function measureViewport(chrome: string, url: string, width: number): Promise<Record<string, unknown>> {
  const profile = mkdtempSync(join(tmpdir(), "pejuang-invite-"));
  let child: ChildProcess | undefined;
  let closed: Promise<void> | undefined;
  let cleanExitListeners: (() => void) | undefined;
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
    closed = new Promise((done) => {
      child!.once("close", () => done());
      child!.once("error", () => done());
    });
    const exited = new Promise<never>((_resolve, reject) => {
      const onError = (error: Error) => reject(error);
      const onExit = (code: number | null) => reject(new Error(`Chrome exited ${code}: ${browserError}`));
      child!.once("error", onError);
      child!.once("exit", onExit);
      cleanExitListeners = () => {
        child!.removeListener("error", onError);
        child!.removeListener("exit", onExit);
      };
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
            if (reply.error) fail(new Error(`Chrome CDP ${method} failed: ${JSON.stringify(reply.error)}`));
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
      )), 20_000);
    })]);
  } finally {
    if (timer) clearTimeout(timer);
    socket?.close();
    if (child) {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      await closed;
      cleanExitListeners?.();
    }
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        rmSync(profile, { recursive: true, force: true });
        break;
      } catch (error) {
        if (attempt === 2 || !(error instanceof Error) || !error.message.includes("ENOTEMPTY")) throw error;
        await new Promise((done) => setTimeout(done, 100));
      }
    }
  }
}