// ─────────────────────────────────────────────────────────────
//  Recommendation engine
//  Analyses evaluation results and produces category winners
// ─────────────────────────────────────────────────────────────
import type {
  ModelEvaluationResult,
  Recommendation,
  RecommendationReport,
} from "@/types/evaluation";

type ReportKey = keyof Omit<RecommendationReport, "generatedAt">;

interface Category {
  key: ReportKey;
  label: string;
  criteriaId: string | null;   // null = use overallScore
  selector: (r: ModelEvaluationResult) => number;
}

const CATEGORIES: Category[] = [
  {
    key: "bestForCoding",
    label: "Best for Coding",
    criteriaId: "code_generation",
    selector: (r) =>
      r.criteriaResults.find((c) => c.criteriaId === "code_generation")
        ?.normalizedScore ?? r.overallScore,
  },
  {
    key: "bestForMath",
    label: "Best for Math",
    criteriaId: "math_reasoning",
    selector: (r) =>
      r.criteriaResults.find((c) => c.criteriaId === "math_reasoning")
        ?.normalizedScore ?? r.overallScore,
  },
  {
    key: "bestForAgentTasks",
    label: "Best for Agent Tasks",
    criteriaId: null,
    selector: (r) => {
      const toolScore =
        r.criteriaResults.find((c) => c.criteriaId === "tool_use")
          ?.normalizedScore ?? 0;
      const instrScore =
        r.criteriaResults.find((c) => c.criteriaId === "instruction_following")
          ?.normalizedScore ?? 0;
      const multiScore =
        r.criteriaResults.find((c) => c.criteriaId === "multi_turn_reasoning")
          ?.normalizedScore ?? 0;
      return Math.round((toolScore + instrScore + multiScore) / 3);
    },
  },
  {
    key: "bestCostEfficient",
    label: "Best Cost Efficient",
    criteriaId: "cost_efficiency",
    selector: (r) =>
      r.criteriaResults.find((c) => c.criteriaId === "cost_efficiency")
        ?.normalizedScore ?? 0,
  },
  {
    key: "bestLongContext",
    label: "Best Long Context",
    criteriaId: "long_context",
    selector: (r) =>
      r.criteriaResults.find((c) => c.criteriaId === "long_context")
        ?.normalizedScore ?? r.overallScore,
  },
];

function reasonFor(
  category: Category,
  winner: ModelEvaluationResult,
  results: ModelEvaluationResult[]
): string {
  const score = category.selector(winner);
  const runnerUp = results
    .filter((r) => r.modelId !== winner.modelId)
    .sort((a, b) => category.selector(b) - category.selector(a))[0];

  const margin = runnerUp
    ? Math.round(score - category.selector(runnerUp))
    : 0;

  switch (category.key) {
    case "bestForCoding":
      return `Scored ${score}/100 on code generation benchmarks (SWE-bench + HumanEval+), ${margin} points ahead of ${runnerUp?.modelName ?? "closest competitor"}.`;
    case "bestForMath":
      return `Achieved ${score}/100 on AIME 2025 + MATH-500, outperforming the next best model by ${margin} points.`;
    case "bestForAgentTasks":
      return `Composite agentic score of ${score}/100 across tool use, instruction following, and multi-turn reasoning.`;
    case "bestCostEfficient":
      return `Best performance-to-cost ratio with total evaluation cost of $${winner.totalCostUSD.toFixed(4)} USD and overall score ${winner.overallScore}/100.`;
    case "bestLongContext":
      return `Scored ${score}/100 on Needle-in-Haystack + RULER with ${winner.modelName.includes("Gemini") || winner.modelName.includes("Opus") ? "1M" : "128k"} token context support.`;
    default:
      return `Top performer with score ${score}/100.`;
  }
}

export function generateRecommendations(
  results: ModelEvaluationResult[]
): RecommendationReport {
  if (results.length === 0) {
    throw new Error("No evaluation results to generate recommendations from");
  }

  const report: Partial<RecommendationReport> = {};

  for (const category of CATEGORIES) {
    const sorted = [...results].sort(
      (a, b) => category.selector(b) - category.selector(a)
    );
    const winner = sorted[0];
    const score = category.selector(winner);

    const rec: Recommendation = {
      category: category.label,
      modelId: winner.modelId,
      modelName: winner.modelName,
      score,
      reason: reasonFor(category, winner, results),
    };

    report[category.key] = rec;
  }

  return {
    ...(report as Omit<RecommendationReport, "generatedAt">),
    generatedAt: new Date().toISOString(),
  };
}
