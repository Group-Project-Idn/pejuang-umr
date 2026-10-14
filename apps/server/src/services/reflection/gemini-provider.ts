import { ReflectionSchema } from "@pejuang/shared";
import { buildReflectionPrompt } from "./prompt";
import type { ReflectionInput, ReflectionProvider } from "./types";

/** REST adapter server-only; never include credentials, response bodies or player data in errors. */
export class GeminiReflectionProvider implements ReflectionProvider {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(env: NodeJS.ProcessEnv = process.env, private readonly request: typeof fetch = fetch) {
    this.apiKey = env.GEMINI_API_KEY?.trim() ?? "";
    this.model = env.GEMINI_MODEL?.trim() ?? "";
  }

  async generate(input: ReflectionInput, signal: AbortSignal): Promise<unknown> {
    if (!this.apiKey || !/^[a-zA-Z0-9._-]+$/.test(this.model)) {
      throw this.failure("GeminiConfigurationError");
    }
    const prompt = buildReflectionPrompt(input);
    let response: Response;
    try {
      response = await this.request(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
        {
          method: "POST",
          signal,
          headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: prompt.system }] },
            contents: [{ role: "user", parts: [{ text: prompt.user }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseJsonSchema: {
                type: "object",
                required: ["source", "summary", "insights"],
                properties: {
                  source: { type: "string", enum: ["ai"] },
                  summary: { type: "string", minLength: 1 },
                  insights: {
                    type: "array", minItems: 1, maxItems: 3,
                    items: {
                      type: "object", required: ["title", "body"],
                      properties: {
                        title: { type: "string", minLength: 1 },
                        body: { type: "string", minLength: 1 },
                        reference: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          }),
        },
      );
    } catch {
      throw this.failure(signal.aborted ? "GeminiAbortError" : "GeminiNetworkError");
    }
    if (!response.ok) throw this.failure("GeminiHttpError");
    try {
      const envelope = await response.json() as {
        candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
      };
      const candidate = envelope.candidates?.[0];
      if (candidate?.finishReason !== "STOP") throw new Error();
      const text = candidate.content?.parts?.filter((part) => !part.thought).map((part) => part.text ?? "").join("");
      const parsed = ReflectionSchema.safeParse(JSON.parse(text ?? ""));
      if (!parsed.success || parsed.data.source !== "ai" || !parsed.data.summary.trim() ||
          parsed.data.insights.length < 1 || parsed.data.insights.length > 3 ||
          parsed.data.insights.some((insight) => !insight.title.trim() || !insight.body.trim())) throw new Error();
      // Defense in depth if the provider echoes the credential in its output.
      if (JSON.stringify(parsed.data).includes(this.apiKey)) throw new Error();
      return parsed.data;
    } catch {
      throw this.failure("GeminiOutputError");
    }
  }

  private failure(name: string): Error {
    const error = new Error("Provider Refleksi tidak tersedia.");
    error.name = name;
    return error;
  }
}