// ─────────────────────────────────────────────────────────────
//  Qwen / Alibaba provider — DashScope OpenAI-compatible API
// ─────────────────────────────────────────────────────────────
import OpenAI from "openai";
import type { LLMProvider, ProviderCallParams, ProviderCallResult } from "./types";

export class QwenProvider implements LLMProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
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
