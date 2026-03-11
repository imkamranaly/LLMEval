// ─────────────────────────────────────────────────────────────
//  Core type definitions for the LLM Evaluation Platform
// ─────────────────────────────────────────────────────────────

export type ModelProvider =
  | "anthropic"
  | "openai"
  | "google"
  | "deepseek"
  | "alibaba"
  | "local";

export interface ModelConfig {
  id: string;
  name: string;
  provider: ModelProvider;
  description: string;
  contextWindow: number;
  inputCostPer1kTokens: number;  // USD
  outputCostPer1kTokens: number; // USD
  apiModel: string;              // actual model string sent to provider
}

export type CriteriaId =
  | "math_reasoning"
  | "code_generation"
  | "long_context"
  | "instruction_following"
  | "structured_output"
  | "multi_turn_reasoning"
  | "hallucination_rate"
  | "tool_use"
  | "cost_efficiency"
  | "latency";

export interface EvaluationCriteria {
  id: CriteriaId;
  name: string;
  description: string;
  benchmark: string;
  weight: number; // 0-1, used for composite scoring
}

// ── Single test-run result ────────────────────────────────────

export interface RunResult {
  runIndex: number;
  score: number;         // 0-100
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  rawOutput?: string;
  error?: string;
}

// ── Aggregated result for one model × criteria pair ──────────

export interface CriteriaResult {
  criteriaId: CriteriaId;
  runs: RunResult[];
  averageScore: number;         // mean of run scores
  stdDev: number;
  averageLatencyMs: number;
  totalTokensUsed: number;
  estimatedCostUSD: number;
  normalizedScore: number;      // 0-100, normalized across all models
}

// ── Full result for one model ─────────────────────────────────

export interface ModelEvaluationResult {
  modelId: string;
  modelName: string;
  provider: ModelProvider;
  criteriaResults: CriteriaResult[];
  overallScore: number;         // weighted average across criteria
  totalCostUSD: number;
  averageLatencyMs: number;
  evaluatedAt: string;          // ISO timestamp
}

// ── Evaluation job ────────────────────────────────────────────

export type EvaluationStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export interface EvaluationJob {
  id: string;
  modelIds: string[];
  criteriaIds: CriteriaId[];
  status: EvaluationStatus;
  progress: number;             // 0-100
  results: ModelEvaluationResult[];
  startedAt: string;
  completedAt?: string;
  error?: string;
}

// ── API request / response shapes ────────────────────────────

export interface EvaluationRequest {
  modelIds: string[];
  criteriaIds: CriteriaId[];
}

export interface EvaluationResponse {
  jobId: string;
  status: EvaluationStatus;
  results: ModelEvaluationResult[];
}

export interface CallModelRequest {
  modelId: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface CallModelResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  model: string;
}

// ── Recommendation engine output ──────────────────────────────

export interface Recommendation {
  category: string;
  modelId: string;
  modelName: string;
  score: number;
  reason: string;
}

export interface RecommendationReport {
  bestForCoding: Recommendation;
  bestForMath: Recommendation;
  bestForAgentTasks: Recommendation;
  bestCostEfficient: Recommendation;
  bestLongContext: Recommendation;
  generatedAt: string;
}

// ── Heatmap data shape ────────────────────────────────────────

export interface HeatmapCell {
  modelId: string;
  modelName: string;
  criteriaId: string;
  criteriaName: string;
  score: number;
}

export interface HeatmapData {
  models: string[];
  criteria: string[];
  cells: HeatmapCell[][];
}

// ── Persistent historical report ──────────────────────────────

export interface HistoricalReport {
  id: string;                        // ISO timestamp used as unique id
  timestamp: string;                 // ISO timestamp
  selectedModels: string[];          // model IDs evaluated
  selectedCriteria: string[];        // criteria IDs tested
  results: ModelEvaluationResult[];  // full results including per-iteration runs
  recommendations?: RecommendationReport;
  heatmap?: { models: string[]; criteria: string[]; matrix: number[][] };
  iterationsPerTest: number;         // 5
  temperature: number;               // 0
  totalCostUSD: number;
  averageLatencyMs: number;
}

// ── Chat types ────────────────────────────────────────────────

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  evaluationResult?: ModelEvaluationResult[];
}
