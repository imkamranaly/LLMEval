// ─────────────────────────────────────────────────────────────
//  Model router — resolves model id → correct provider
// ─────────────────────────────────────────────────────────────
import { MODEL_MAP } from "@/data/models";
import { AnthropicProvider } from "@/providers/anthropic";
import { OpenAIProvider } from "@/providers/openai";
import { GoogleProvider } from "@/providers/google";
import { DeepSeekProvider } from "@/providers/deepseek";
import { QwenProvider } from "@/providers/qwen";
import { LocalProvider } from "@/providers/local";
import type { LLMProvider } from "@/providers/types";
import type { CallModelRequest, CallModelResponse } from "@/types/evaluation";

// Lazily instantiated provider singletons (server-side only)
const providers: Partial<Record<string, LLMProvider>> = {};

function getProvider(providerKey: string): LLMProvider {
  if (!providers[providerKey]) {
    switch (providerKey) {
      case "anthropic":
        providers[providerKey] = new AnthropicProvider();
        break;
      case "openai":
        providers[providerKey] = new OpenAIProvider();
        break;
      case "google":
        providers[providerKey] = new GoogleProvider();
        break;
      case "deepseek":
        providers[providerKey] = new DeepSeekProvider();
        break;
      case "alibaba":
        providers[providerKey] = new QwenProvider();
        break;
      case "local":
      default:
        providers[providerKey] = new LocalProvider();
        break;
    }
  }
  return providers[providerKey]!;
}

/**
 * Unified entry point for calling any model.
 * Resolves the model config, selects the provider, calls the API.
 */
export async function callModel(
  request: CallModelRequest
): Promise<CallModelResponse> {
  const modelConfig = MODEL_MAP[request.modelId];
  if (!modelConfig) {
    throw new Error(`Unknown model id: ${request.modelId}`);
  }

  const provider = getProvider(modelConfig.provider);

  const result = await provider.call({
    model: modelConfig.apiModel,
    prompt: request.prompt,
    systemPrompt: request.systemPrompt,
    temperature: request.temperature ?? 0,
    maxTokens: request.maxTokens ?? 2048,
  });

  return {
    ...result,
    model: modelConfig.name,
  };
}
