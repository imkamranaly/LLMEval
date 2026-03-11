// ─────────────────────────────────────────────────────────────
//  Anthropic provider — Claude models
// ─────────────────────────────────────────────────────────────
import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, ProviderCallParams, ProviderCallResult } from "./types";

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async call(params: ProviderCallParams): Promise<ProviderCallResult> {
    const start = Date.now();

    const response = await this.client.messages.create({
      model: params.model,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      system: params.systemPrompt,
      messages: [{ role: "user", content: params.prompt }],
    });

    const latencyMs = Date.now() - start;
    const content =
      response.content[0].type === "text" ? response.content[0].text : "";

    return {
      content,
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      latencyMs,
    };
  }
}
