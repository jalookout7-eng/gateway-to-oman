import Groq from "groq-sdk";
import Anthropic from "@anthropic-ai/sdk";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export type AIBackendMode = "groq-direct" | "litellm-proxy";

// ---------------------------------------------------------------------------
// Groq
// ---------------------------------------------------------------------------

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

function getBackendMode(): AIBackendMode {
  const mode = process.env.AI_BACKEND_MODE ?? "groq-direct";
  if (mode === "groq-direct" || mode === "litellm-proxy") return mode;
  throw new Error(`Unsupported AI_BACKEND_MODE: ${mode}`);
}

async function chatViaGroq(messages: ChatMessage[]): Promise<string> {
  const client = getGroqClient();
  const response = await client.chat.completions.create({
    model: process.env.GROQ_MODEL ?? "llama-3.1-8b-instant",
    messages,
    temperature: 0.7,
    max_tokens: 300,
  });
  return response.choices[0]?.message?.content ?? "";
}

async function chatViaLiteLLM(messages: ChatMessage[]): Promise<string> {
  const baseUrl = process.env.LITELLM_BASE_URL;
  const apiKey = process.env.LITELLM_API_KEY;
  const model = process.env.LITELLM_MODEL ?? "groq/llama-3.3-70b-versatile";
  if (!baseUrl || !apiKey) {
    throw new Error("LITELLM_BASE_URL and LITELLM_API_KEY must be set when AI_BACKEND_MODE=litellm-proxy");
  }
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 300 }),
  });
  if (!res.ok) throw new Error(`LiteLLM proxy returned ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

// ---------------------------------------------------------------------------
// Anthropic
// ---------------------------------------------------------------------------

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY must be set when AI_PROVIDER=anthropic");
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

async function chatViaAnthropic(messages: ChatMessage[]): Promise<string> {
  const client = getAnthropicClient();
  const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

  // Anthropic takes the system prompt as a top-level field, not as a message.
  // Extract any leading system message and pass it separately.
  let systemPrompt: string | undefined;
  const nonSystemMessages: Anthropic.MessageParam[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      // Concatenate multiple system messages (edge-case safety), last one wins
      systemPrompt = msg.content;
    } else {
      nonSystemMessages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }
  }

  const response = await client.messages.create({
    model,
    max_tokens: 300,
    ...(systemPrompt !== undefined ? { system: systemPrompt } : {}),
    messages: nonSystemMessages,
  });

  // Extract text from the first content block
  const firstBlock = response.content[0];
  if (firstBlock?.type === "text") {
    return firstBlock.text;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Failover helpers
// ---------------------------------------------------------------------------

/**
 * Returns true for transient errors that warrant a provider failover:
 * - Network/connection errors (APIConnectionError, ECONNRESET, etc.)
 * - HTTP 429 (rate-limited), 500–599 (server errors), 529 (Anthropic overloaded)
 *
 * Non-transient errors (400, 401, 403, 404) return false — rethrow as-is.
 */
function isRetriable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; code?: string; status?: number; message?: string };
  if (e.name === "APIConnectionError") return true;
  if (e.code && ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN"].includes(e.code)) return true;
  if (typeof e.message === "string" && /fetch failed|network|timeout/i.test(e.message)) return true;
  const s = e.status;
  if (typeof s === "number" && (s === 429 || s === 529 || (s >= 500 && s < 600))) return true;
  return false;
}

/**
 * Routes a chat call to the named provider. Groq path respects AI_BACKEND_MODE.
 */
async function callProvider(name: string, messages: ChatMessage[]): Promise<string> {
  if (name === "anthropic") return chatViaAnthropic(messages);
  if (name === "groq") {
    const mode = getBackendMode();
    if (mode === "groq-direct") return chatViaGroq(messages);
    return chatViaLiteLLM(messages);
  }
  throw new Error(`Unknown AI provider: ${name}`);
}

// ---------------------------------------------------------------------------
// Public entry point (unchanged signature)
// ---------------------------------------------------------------------------

export async function chat(messages: ChatMessage[]): Promise<string> {
  const primary = process.env.AI_PROVIDER ?? "anthropic";
  const fallback = process.env.AI_PROVIDER_FALLBACK ?? "groq";
  try {
    return await callProvider(primary, messages);
  } catch (err) {
    if (fallback && fallback !== primary && isRetriable(err)) {
      const e = err as { name?: string; status?: number; message?: string };
      console.warn(
        `[ai] primary "${primary}" failed (${e?.status ?? e?.name ?? "unknown"}: ${e?.message ?? ""}); failing over to "${fallback}"`,
      );
      return await callProvider(fallback, messages);
    }
    throw err;
  }
}
