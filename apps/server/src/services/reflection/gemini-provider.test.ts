import { describe, expect, it, vi } from "vitest";
import type { Reflection } from "@pejuang/shared";
import { GeminiReflectionProvider } from "./gemini-provider";
import { ReflectionService } from "./service";
import type { ReflectionInput } from "./types";

const key = "test-private-api-key";
const input: ReflectionInput = {
  playerCount: 2,
  log: [{ kind: "inviteSent", step: 1, plan: "hangout" }],
  finalStatus: { wealth: 100, debt: 0, health: 5, stress: 2 },
  score: 50,
  points: { finance: 50, health: 50, calm: 80 },
  rank: 1,
  eliminated: null,
};
const fallback: Reflection = {
  source: "rules", summary: "Cadangan.", insights: [{ title: "Aturan", body: "Cadangan." }],
};
const valid = { source: "ai", summary: "Kamu punya pilihan.", insights: [{ title: "Pilihan", body: "Perhatikan biaya." }] };
function reply(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}
function candidate(value: unknown): Response {
  return reply({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(value) }] } }] });
}
function setup(request: typeof fetch, env: NodeJS.ProcessEnv = { GEMINI_API_KEY: key, GEMINI_MODEL: "gemini-test" }) {
  const logs: string[] = [];
  const provider = new GeminiReflectionProvider(env, request);
  const svc = new ReflectionService({ provider, log: (line) => logs.push(line), timeoutMs: 30 });
  return { svc, logs };
}

describe("GeminiReflectionProvider", () => {
  it("mengirim hanya prompt pemain dan secret di header; memvalidasi hasil", async () => {
    const request = vi.fn<typeof fetch>(async () => candidate(valid));
    const { svc, logs } = setup(request);
    const result = await svc.create(input, fallback);
    expect(result, logs.join("; ")).toEqual(valid);
    expect(logs).toEqual([]);
    expect(String(request.mock.calls[0]?.[0])).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent");
    const options = request.mock.calls[0]?.[1];
    expect(options?.method).toBe("POST");
    expect(options?.headers).toMatchObject({ "x-goog-api-key": key });
    const body = JSON.parse(String(options?.body)) as {
      contents: Array<{ parts: Array<{ text: string }> }>;
      generationConfig: { responseMimeType: string; responseJsonSchema: { properties: { insights: { maxItems: number } } } };
    };
    const prompt = body.contents[0]!.parts[0]!.text;
    expect(prompt).toContain('"playerCount":2');
    expect(prompt).toContain('"inviteSent"');
    expect(JSON.stringify(body)).not.toContain(key);
    for (const field of ["targetId", "otherPlayerId", "playerId", "inviteCard"]) {
      expect(prompt).not.toContain(`"${field}"`);
    }
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseJsonSchema.properties.insights.maxItems).toBe(3);
  });

  it("konfigurasi kosong atau model tidak aman: fallback tanpa HTTP", async () => {
    const request = vi.fn<typeof fetch>();
    for (const env of [{}, { GEMINI_API_KEY: key }, { GEMINI_API_KEY: key, GEMINI_MODEL: "../bad" }]) {
      const { svc, logs } = setup(request, env);
      expect(await svc.create(input, fallback)).toBe(fallback);
      expect(logs[0]).toContain("GeminiConfigurationError");
    }
    expect(request).not.toHaveBeenCalled();
  });

  it("HTTP, jaringan, JSON dan schema gagal: fallback tanpa kebocoran pada log", async () => {
    const cases: Array<() => Promise<Response>> = [
      async () => new Response(`error ${key} private player`, { status: 429 }),
      async () => { throw new Error(`${key} private player`); },
      async () => new Response("not-json"),
      async () => candidate({ source: "ai", summary: "x", insights: [] }),
      async () => candidate({ ...valid, insights: Array.from({ length: 4 }, () => valid.insights[0]) }),
      async () => reply({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "not-json" }] } }] }),
      async () => candidate({ ...valid, insights: [{ title: "x", body: " " }] }),
      async () => candidate({ ...valid, summary: key }),
      async () => reply({ candidates: [{ finishReason: "SAFETY", content: { parts: [{ text: JSON.stringify(valid) }] } }] }),
    ];
    for (const run of cases) {
      const { svc, logs } = setup(vi.fn<typeof fetch>(run));
      expect(await svc.create(input, fallback)).toBe(fallback);
      expect(logs).toHaveLength(1);
      expect(logs.join("")).not.toMatch(/test-private-api-key|private player/);
    }
  });

  it("timeout membatalkan HTTP dan langsung memakai fallback", async () => {
    let aborted = false;
    const request = vi.fn<typeof fetch>(async (_url, options) => new Promise<Response>((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => {
        aborted = true;
        reject(new Error(key));
      });
    }));
    const { svc, logs } = setup(request);
    expect(await svc.create(input, fallback)).toBe(fallback);
    expect(aborted).toBe(true);
    expect(logs.join("")).not.toContain(key);
  });

  it("nama error dari transport tidak boleh masuk log", async () => {
    const request = vi.fn<typeof fetch>(async () => {
      const error = new Error("private player");
      error.name = key;
      throw error;
    });
    const { svc, logs } = setup(request);
    expect(await svc.create(input, fallback)).toBe(fallback);
    expect(logs).toEqual(["[reflection] provider gagal (GeminiNetworkError), memakai cadangan aturan"]);
  });
});