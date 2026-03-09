// ─────────────────────────────────────────────────────────────
//  Google provider — Gemini models
// ─────────────────────────────────────────────────────────────
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LLMProvider, ProviderCallParams, ProviderCallResult } from "./types";

export class GoogleProvider implements LLMProvider {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? "");
  }

  async call(params: ProviderCallParams): Promise<ProviderCallResult> {
    const start = Date.now();

    const model = this.genAI.getGenerativeModel({
      model: params.model,
      generationConfig: {
        temperature: params.temperature,
        maxOutputTokens: params.maxTokens,
      },
      systemInstruction: params.systemPrompt,
    });

    const result = await model.generateContent(params.prompt);
    const response = result.response;
    const latencyMs = Date.now() - start;

    const usage = response.usageMetadata;

    return {
      content: response.text(),
      promptTokens: usage?.promptTokenCount ?? 0,
      completionTokens: usage?.candidatesTokenCount ?? 0,
      totalTokens: usage?.totalTokenCount ?? 0,
      latencyMs,
    };
  }
}
