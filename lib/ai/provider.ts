import Groq from "groq-sdk";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export type AIBackendMode = "groq-direct" | "litellm-proxy";

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

export async function chat(messages: ChatMessage[]): Promise<string> {
  const mode = getBackendMode();
  if (mode === "groq-direct") return chatViaGroq(messages);
  return chatViaLiteLLM(messages);
}
