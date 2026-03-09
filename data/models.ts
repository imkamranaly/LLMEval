// ─────────────────────────────────────────────────────────────
//  Model registry — add / remove models here only
// ─────────────────────────────────────────────────────────────
import type { ModelConfig } from "@/types/evaluation";

export const MODELS: ModelConfig[] = [
  {
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    provider: "anthropic",
    description: "Anthropic's most powerful model — strongest agentic reasoning, 1M context window",
    contextWindow: 1_000_000,
    inputCostPer1kTokens: 0.015,
    outputCostPer1kTokens: 0.075,
    apiModel: "claude-opus-4-6",
  },
  {
    id: "claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    description: "Anthropic fast and cost-efficient model with strong general performance",
    contextWindow: 200_000,
    inputCostPer1kTokens: 0.003,
    outputCostPer1kTokens: 0.015,
    apiModel: "claude-sonnet-4-5-20251001",
  },
  {
    id: "gpt-5-2-thinking",
    name: "GPT-5.2 Thinking",
    provider: "openai",
    description: "OpenAI's extended-thinking model — strong math and scientific reasoning",
    contextWindow: 200_000,
    inputCostPer1kTokens: 0.01,
    outputCostPer1kTokens: 0.04,
    apiModel: "gpt-5.2",
  },
  {
    id: "gpt-5-2-codex",
    name: "GPT-5.2 Codex",
    provider: "openai",
    description: "OpenAI model optimized for code generation and software engineering tasks",
    contextWindow: 200_000,
    inputCostPer1kTokens: 0.008,
    outputCostPer1kTokens: 0.032,
    apiModel: "gpt-5.2-codex",
  },
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    provider: "google",
    description: "Google's flagship model — strong user preference and MMLU performance",
    contextWindow: 1_000_000,
    inputCostPer1kTokens: 0.00125,
    outputCostPer1kTokens: 0.005,
    apiModel: "gemini-3-pro",
  },
  {
    id: "gemini-2-5-pro-deep-think",
    name: "Gemini 2.5 Pro Deep Think",
    provider: "google",
    description: "Google extended-reasoning variant — deep analytical and chain-of-thought tasks",
    contextWindow: 1_000_000,
    inputCostPer1kTokens: 0.00350,
    outputCostPer1kTokens: 0.01050,
    apiModel: "gemini-2-5-pro-deep-think",
  },
  {
    id: "deepseek-v3-2",
    name: "DeepSeek V3.2",
    provider: "deepseek",
    description: "DeepSeek's general flagship — outstanding cost-performance ratio",
    contextWindow: 128_000,
    inputCostPer1kTokens: 0.00027,
    outputCostPer1kTokens: 0.0011,
    apiModel: "deepseek-chat",
  },
  {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    provider: "deepseek",
    description: "DeepSeek reasoning model — strong theorem proving and logical deduction",
    contextWindow: 128_000,
    inputCostPer1kTokens: 0.00055,
    outputCostPer1kTokens: 0.00219,
    apiModel: "deepseek-reasoner",
  },
  {
    id: "qwen3-latest",
    name: "Qwen3 Latest",
    provider: "alibaba",
    description: "Alibaba's latest Qwen model — strong GPQA and science benchmark performance",
    contextWindow: 128_000,
    inputCostPer1kTokens: 0.0004,
    outputCostPer1kTokens: 0.0016,
    apiModel: "qwen3-235b-a22b",
  },
  {
    id: "llama-3-3-70b",
    name: "Llama 3.3 70B",
    provider: "local",
    description: "Meta open-source baseline — self-hostable, strong general performance",
    contextWindow: 128_000,
    inputCostPer1kTokens: 0.00023,
    outputCostPer1kTokens: 0.00023,
    apiModel: "llama-3.3-70b-versatile",
  },
];

/** Quick lookup by model id */
export const MODEL_MAP: Record<string, ModelConfig> = Object.fromEntries(
  MODELS.map((m) => [m.id, m])
);
