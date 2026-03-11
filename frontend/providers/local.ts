// ─────────────────────────────────────────────────────────────
//  Local / open-source model provider
//  Supports Ollama (http://localhost:11434) and any
//  OpenAI-compatible local server via LOCAL_MODEL_BASE_URL
// ─────────────────────────────────────────────────────────────
import OpenAI from "openai";
import type { LLMProvider, ProviderCallParams, ProviderCallResult } from "./types";

export class LocalProvider implements LLMProvider {
  private client: OpenAI;

  constructor() {
    const baseURL =
      process.env.LOCAL_MODEL_BASE_URL ?? "http://localhost:11434/v1";
    this.client = new OpenAI({
      apiKey: process.env.LOCAL_MODEL_API_KEY ?? "ollama", // Ollama ignores key
      baseURL,
    });
  }

  async call(params: ProviderCallParams): Promise<ProviderCallResult> {
    const start = Date.now();

    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (params.systemPrompt) {
      messages.push({ role: "system", content: params.systemPrompt });
    }
    messages.push({ role: "user", content: params.prompt });

    const response = await this.client.chat.completions.create({
      model: params.model,
      messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
    });

    const latencyMs = Date.now() - start;
    const choice = response.choices[0];

    return {
      content: choice.message.content ?? "",
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
      latencyMs,
    };
  }
}
