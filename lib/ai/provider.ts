import Groq from "groq-sdk";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

export async function chat(messages: ChatMessage[]): Promise<string> {
  const provider = process.env.AI_PROVIDER ?? "groq";

  if (provider === "groq") {
    const client = getGroqClient();
    const response = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages,
      temperature: 0.7,
      max_tokens: 300,
    });
    return response.choices[0]?.message?.content ?? "";
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}
