// ─────────────────────────────────────────────────────────────
//  Google provider — Gemini models
//
//  Model routing:
//  • *-deep-think models → thinking mode enabled (thinkingBudget: -1)
//  • everything else     → standard generation
// ─────────────────────────────────────────────────────────────
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LLMProvider, ProviderCallParams, ProviderCallResult } from "./types";

/** Deep-think / extended-reasoning models need thinking config */
function isDeepThinkModel(model: string): boolean {
  return model.includes("deep-think") || model.includes("deepthink");
}

/**
 * Resolve the real Gemini API model name.
 * Deep-think variants use the base model with thinkingConfig — strip the suffix.
 */
function resolveApiModel(model: string): string {
  if (isDeepThinkModel(model)) {
    return model
      .replace(/-deep-think$/i, "")
      .replace(/-deepthink$/i, "");
  }
  return model;
}

export class GoogleProvider implements LLMProvider {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? "");
  }

  async call(params: ProviderCallParams): Promise<ProviderCallResult> {
    const start = Date.now();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generationConfig: Record<string, any> = {
      maxOutputTokens: params.maxTokens,
    };

    // Thinking models do not support temperature < 1; standard models accept 0
    if (!isDeepThinkModel(params.model)) {
      generationConfig.temperature = params.temperature;
    }

    // Enable extended thinking for deep-think variants
    if (isDeepThinkModel(params.model)) {
      generationConfig.thinkingConfig = { thinkingBudget: -1 }; // dynamic budget
    }

    const modelOptions: Parameters<typeof this.genAI.getGenerativeModel>[0] = {
      model: resolveApiModel(params.model),
      generationConfig,
    };

    // Only pass systemInstruction when a system prompt is actually provided
    if (params.systemPrompt) {
      modelOptions.systemInstruction = params.systemPrompt;
    }

    const model = this.genAI.getGenerativeModel(modelOptions);

    const result = await model.generateContent(params.prompt);
    const response = result.response;
    const latencyMs = Date.now() - start;

    const usage = response.usageMetadata;

    // response.text() can throw if the response was blocked — guard it
    let content = "";
    try {
      content = response.text();
    } catch {
      content = "";
    }

    return {
      content,
      promptTokens: usage?.promptTokenCount ?? 0,
      // candidatesTokenCount may exclude thinking tokens; use totalTokenCount - promptTokenCount as fallback
      completionTokens:
        usage?.candidatesTokenCount ??
        ((usage?.totalTokenCount ?? 0) - (usage?.promptTokenCount ?? 0)),
      totalTokens: usage?.totalTokenCount ?? 0,
      latencyMs,
    };
  }
}
