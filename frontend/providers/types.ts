// Shared provider interface — all providers implement this
export interface ProviderCallParams {
  model: string;         // provider-specific model identifier
  prompt: string;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
}

export interface ProviderCallResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
}

export interface LLMProvider {
  call(params: ProviderCallParams): Promise<ProviderCallResult>;
}
