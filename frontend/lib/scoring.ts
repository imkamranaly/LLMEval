// ─────────────────────────────────────────────────────────────
//  Scoring engine
//  Runs benchmark prompts, grades responses, and computes
//  normalized scores across all runs and criteria.
// ─────────────────────────────────────────────────────────────
import { callModel } from "@/lib/modelRouter";
import { BENCHMARK_PROMPTS, type BenchmarkPrompt } from "@/lib/benchmarks";
import { MODEL_MAP } from "@/data/models";
import { CRITERIA_MAP } from "@/data/evaluationCriteria";
import type {
  CriteriaId,
  CriteriaResult,
  ModelEvaluationResult,
  RunResult,
} from "@/types/evaluation";

// ── Config ────────────────────────────────────────────────────

const RUNS_PER_TEST = 5;
const TEMPERATURE = 0;
const DEFAULT_MAX_TOKENS = 2048;

// ── Helpers ───────────────────────────────────────────────────

/** Compute population standard deviation */
function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Normalize an array of raw scores to 0-100 range (min-max) */
export function normalizeScores(
  rawScores: Record<string, number>
): Record<string, number> {
  const values = Object.values(rawScores);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return Object.fromEntries(Object.keys(rawScores).map((k) => [k, 100]));
  return Object.fromEntries(
    Object.entries(rawScores).map(([k, v]) => [
      k,
      Math.round(((v - min) / (max - min)) * 100),
    ])
  );
}

// ── Graders ───────────────────────────────────────────────────

/**
 * Exact-match grader — strips whitespace and lowercases.
 * Returns 100 on match, 0 otherwise.
 */
function gradeExactMatch(output: string, expected: string): number {
  const clean = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return clean(output).includes(clean(expected)) ? 100 : 0;
}

/**
 * Heuristic grader for criteria without expected answers.
 * Scores based on output quality signals.
 */
function gradeHeuristic(
  criteriaId: CriteriaId,
  output: string,
  prompt: BenchmarkPrompt
): number {
  const len = output.trim().length;

  switch (criteriaId) {
    case "structured_output": {
      // Try to parse JSON — reward valid JSON
      try {
        JSON.parse(output.trim());
        return 95;
      } catch {
        // Check for XML
        if (output.includes("<?xml") || output.includes("<products>")) return 80;
        // Partial JSON
        if (output.includes("{") && output.includes("}")) return 50;
        return 10;
      }
    }

    case "instruction_following": {
      // Check for markdown fences when they should be absent (inst_001)
      if (prompt.id === "inst_001") {
        if (output.includes("```")) return 20;
        try { JSON.parse(output.trim()); return 95; } catch { return 40; }
      }
      // Check bullet structure
      const bullets = output.split("\n").filter((l) => l.trim().startsWith("•") || l.trim().startsWith("-") || l.trim().startsWith("*"));
      if (bullets.length === 3) return 90;
      if (bullets.length > 0) return 60;
      return 40;
    }

    case "code_generation": {
      // Penalise empty or too-short responses
      if (len < 100) return 20;
      // Reward typed signatures, docstrings, edge case handling
      let score = 50;
      if (output.includes("def ") || output.includes("function ") || output.includes("=>")) score += 15;
      if (output.includes("//") || output.includes("#") || output.includes('"""')) score += 10;
      if (output.includes("test") || output.includes("edge")) score += 10;
      if (output.includes(":") && output.includes("->")) score += 5; // typed
      return Math.min(score, 95);
    }

    case "multi_turn_reasoning": {
      if (len < 50) return 20;
      // Check context retention signals
      let score = 60;
      if (/shinkansen|bullet|train/i.test(output)) score += 15;
      if (/yen|jpy|\$/i.test(output)) score += 10;
      if (/ticket|purchase|buy/i.test(output)) score += 10;
      return Math.min(score, 95);
    }

    case "tool_use": {
      try {
        const parsed = JSON.parse(output.trim());
        if (Array.isArray(parsed) && parsed.length === 2) return 95;
        if (Array.isArray(parsed)) return 70;
      } catch { /* fall through */ }
      if (output.includes("get_weather") && output.includes("calculate")) return 60;
      return 20;
    }

    default:
      return len > 100 ? 70 : 40;
  }
}

/** Grade a single model response against a benchmark prompt */
function gradeResponse(
  criteriaId: CriteriaId,
  output: string,
  prompt: BenchmarkPrompt
): number {
  if (output.includes("[SIMULATED]") || output.length === 0) return 0;

  if (prompt.expectedAnswer) {
    return gradeExactMatch(output, prompt.expectedAnswer);
  }
  return gradeHeuristic(criteriaId, output, prompt);
}

// ── Core evaluation ───────────────────────────────────────────

/**
 * Run all benchmark prompts for a single (model × criteria) pair.
 * Each prompt is executed RUNS_PER_TEST times at temperature=0.
 */
async function evaluateCriteria(
  modelId: string,
  criteriaId: CriteriaId,
  onProgress?: (msg: string) => void
): Promise<Omit<CriteriaResult, "normalizedScore">> {
  const prompts = BENCHMARK_PROMPTS[criteriaId];
  const modelConfig = MODEL_MAP[modelId];

  // Cost-efficiency and latency are derived — no direct prompts
  if (!prompts || prompts.length === 0) {
    return {
      criteriaId,
      runs: [],
      averageScore: 0,
      stdDev: 0,
      averageLatencyMs: 0,
      totalTokensUsed: 0,
      estimatedCostUSD: 0,
    };
  }

  const allRuns: RunResult[] = [];

  for (let run = 0; run < RUNS_PER_TEST; run++) {
    let runScoreSum = 0;
    let runLatency = 0;
    let runPromptTokens = 0;
    let runCompletionTokens = 0;

    for (const bp of prompts) {
      onProgress?.(`${modelId} | ${criteriaId} | run ${run + 1}/${RUNS_PER_TEST} | prompt ${bp.id}`);

      try {
        const result = await callModel({
          modelId,
          prompt: bp.prompt,
          systemPrompt: bp.systemPrompt,
          temperature: TEMPERATURE,
          maxTokens: bp.maxTokens ?? DEFAULT_MAX_TOKENS,
        });

        const score = gradeResponse(criteriaId, result.content, bp);
        runScoreSum += score;
        runLatency += result.latencyMs;
        runPromptTokens += result.promptTokens;
        runCompletionTokens += result.completionTokens;
      } catch (err) {
        // Record failed run — score 0
        runScoreSum += 0;
        runLatency += 5000; // pessimistic latency for failure
        console.error(`Evaluation error for ${modelId}/${criteriaId}/${bp.id}:`, err);
      }
    }

    const avgScore = runScoreSum / prompts.length;
    allRuns.push({
      runIndex: run,
      score: Math.round(avgScore),
      latencyMs: Math.round(runLatency / prompts.length),
      promptTokens: runPromptTokens,
      completionTokens: runCompletionTokens,
      totalTokens: runPromptTokens + runCompletionTokens,
    });
  }

  const scores = allRuns.map((r) => r.score);
  const latencies = allRuns.map((r) => r.latencyMs);
  const totalTokens = allRuns.reduce((s, r) => s + r.totalTokens, 0);

  const inputTokens = allRuns.reduce((s, r) => s + r.promptTokens, 0);
  const outputTokens = allRuns.reduce((s, r) => s + r.completionTokens, 0);
  const estimatedCostUSD =
    (inputTokens / 1000) * modelConfig.inputCostPer1kTokens +
    (outputTokens / 1000) * modelConfig.outputCostPer1kTokens;

  return {
    criteriaId,
    runs: allRuns,
    averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    stdDev: Math.round(stdDev(scores) * 10) / 10,
    averageLatencyMs: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
    totalTokensUsed: totalTokens,
    estimatedCostUSD: Math.round(estimatedCostUSD * 10000) / 10000,
  };
}

// ── Public API ────────────────────────────────────────────────

/**
 * Run full evaluation for a set of models and criteria.
 * Returns one ModelEvaluationResult per model.
 */
export async function runEvaluation(
  modelIds: string[],
  criteriaIds: CriteriaId[],
  onProgress?: (msg: string) => void
): Promise<ModelEvaluationResult[]> {
  const allResults: ModelEvaluationResult[] = [];

  for (const modelId of modelIds) {
    const modelConfig = MODEL_MAP[modelId];
    if (!modelConfig) continue;

    onProgress?.(`Starting evaluation for ${modelConfig.name}`);
    const criteriaResults: CriteriaResult[] = [];

    for (const criteriaId of criteriaIds) {
      const result = await evaluateCriteria(modelId, criteriaId, onProgress);
      criteriaResults.push({ ...result, normalizedScore: result.averageScore });
    }

    // ── Derived criteria ─────────────────────────────────────

    // Latency: invert so lower latency = higher score
    const avgLatency =
      criteriaResults.reduce((s, r) => s + r.averageLatencyMs, 0) /
      Math.max(criteriaResults.length, 1);

    // Cost efficiency: performance / cost ratio
    const totalCost = criteriaResults.reduce((s, r) => s + r.estimatedCostUSD, 0);
    const avgPerformance =
      criteriaResults.reduce((s, r) => s + r.averageScore, 0) /
      Math.max(criteriaResults.length, 1);

    if (criteriaIds.includes("latency")) {
      const latencyCriteriaIdx = criteriaResults.findIndex(
        (c) => c.criteriaId === "latency"
      );
      const latencyScore = Math.max(0, 100 - avgLatency / 100); // 10s = 0, 0s = 100
      if (latencyCriteriaIdx >= 0) {
        criteriaResults[latencyCriteriaIdx].averageScore = Math.round(latencyScore);
        criteriaResults[latencyCriteriaIdx].averageLatencyMs = Math.round(avgLatency);
      }
    }

    if (criteriaIds.includes("cost_efficiency")) {
      const costIdx = criteriaResults.findIndex(
        (c) => c.criteriaId === "cost_efficiency"
      );
      const costScore = totalCost > 0 ? Math.min(100, (avgPerformance / (totalCost * 1000)) * 10) : 50;
      if (costIdx >= 0) {
        criteriaResults[costIdx].averageScore = Math.round(costScore);
        criteriaResults[costIdx].estimatedCostUSD = totalCost;
      }
    }

    // ── Overall weighted score ───────────────────────────────
    let weightedSum = 0;
    let totalWeight = 0;
    for (const cr of criteriaResults) {
      const criteria = CRITERIA_MAP[cr.criteriaId];
      if (criteria) {
        weightedSum += cr.averageScore * criteria.weight;
        totalWeight += criteria.weight;
      }
    }
    const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

    allResults.push({
      modelId,
      modelName: modelConfig.name,
      provider: modelConfig.provider,
      criteriaResults,
      overallScore,
      totalCostUSD: Math.round(totalCost * 10000) / 10000,
      averageLatencyMs: Math.round(avgLatency),
      evaluatedAt: new Date().toISOString(),
    });
  }

  // ── Cross-model normalization ────────────────────────────────
  // Normalize each criterion score across all models
  for (const criteriaId of criteriaIds) {
    const rawScores: Record<string, number> = {};
    for (const result of allResults) {
      const cr = result.criteriaResults.find((c) => c.criteriaId === criteriaId);
      if (cr) rawScores[result.modelId] = cr.averageScore;
    }
    const normalized = normalizeScores(rawScores);
    for (const result of allResults) {
      const cr = result.criteriaResults.find((c) => c.criteriaId === criteriaId);
      if (cr) cr.normalizedScore = normalized[result.modelId] ?? cr.averageScore;
    }
  }

  return allResults;
}

/**
 * Build heatmap matrix from evaluation results.
 * Returns rows = models, columns = criteria, values = normalized scores.
 */
export function buildHeatmapMatrix(
  results: ModelEvaluationResult[]
): { models: string[]; criteria: string[]; matrix: number[][] } {
  if (results.length === 0) return { models: [], criteria: [], matrix: [] };

  const models = results.map((r) => r.modelName);
  const criteriaIds = results[0].criteriaResults.map((c) => c.criteriaId);
  const criteria = criteriaIds.map(
    (id) => CRITERIA_MAP[id]?.name ?? id
  );

  const matrix = results.map((result) =>
    criteriaIds.map((cid) => {
      const cr = result.criteriaResults.find((c) => c.criteriaId === cid);
      return cr?.normalizedScore ?? 0;
    })
  );

  return { models, criteria, matrix };
}
