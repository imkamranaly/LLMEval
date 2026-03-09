// ─────────────────────────────────────────────────────────────
//  OpenAI provider — GPT models
//
//  Model routing (confirmed by live API testing):
//  • *-codex models  → /v1/responses API  (max_output_tokens)
//  • gpt-5.x models  → /v1/chat/completions (max_completion_tokens)
//  • everything else → /v1/chat/completions (max_tokens)
// ─────────────────────────────────────────────────────────────
import OpenAI from "openai";
import type { LLMProvider, ProviderCallParams, ProviderCallResult } from "./types";

/** Codex models use the /v1/responses API, not chat completions */
function isResponsesModel(model: string): boolean {
  return model.includes("codex");
}

/** gpt-5.x models require max_completion_tokens instead of max_tokens */
function needsCompletionTokensParam(model: string): boolean {
  return /^gpt-5/.test(model);
}

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async call(params: ProviderCallParams): Promise<ProviderCallResult> {
    const start = Date.now();

    // ── /v1/responses endpoint (e.g. gpt-5.2-codex) ──────────
    if (isResponsesModel(params.model)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (this.client as any).responses.create({
        model: params.model,
        input: params.prompt,
        ...(params.systemPrompt ? { instructions: params.systemPrompt } : {}),
        max_output_tokens: params.maxTokens,
      });

      const latencyMs = Date.now() - start;

      // Extract text from output array: [{type:"reasoning",...},{type:"message",content:[{type:"output_text",text:"..."}]}]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messageOutput = response.output?.find((o: any) => o.type === "message");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text = messageOutput?.content?.find((c: any) => c.type === "output_text")?.text ?? "";

      return {
        content: text,
        promptTokens: response.usage?.input_tokens ?? 0,
        completionTokens: response.usage?.output_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
        latencyMs,
      };
    }

    // ── /v1/chat/completions endpoint ─────────────────────────
    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (params.systemPrompt) {
      messages.push({ role: "system", content: params.systemPrompt });
    }
    messages.push({ role: "user", content: params.prompt });

    const tokenParam = needsCompletionTokensParam(params.model)
      ? { max_completion_tokens: params.maxTokens }
      : { max_tokens: params.maxTokens };

    const response = await this.client.chat.completions.create({
      model: params.model,
      messages,
      temperature: params.temperature,
      ...tokenParam,
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
