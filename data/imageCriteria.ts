// ─────────────────────────────────────────────────────────────
//  Image-extracted evaluation criteria
//  Source image: 10-Item Evaluation Criteria table
//
//  Fields parsed from image:
//    Evaluation Item | What It Tests | Benchmark / Method
//
//  The original EVALUATION_CRITERIA list in evaluationCriteria.ts
//  is NOT replaced — this file exports a merged list that enriches
//  existing entries with image-sourced descriptions.
// ─────────────────────────────────────────────────────────────
import type { EvaluationCriteria } from "@/types/evaluation";
import { EVALUATION_CRITERIA } from "./evaluationCriteria";

// ── Raw parsed rows from the image ───────────────────────────

export interface ImageCriteriaRow {
  evaluationItem: string;
  whatItTests: string;
  benchmarkMethod: string;
}

/** Criteria data as parsed from the 10-Item Evaluation Criteria image */
export const IMAGE_CRITERIA_ROWS: ImageCriteriaRow[] = [
  {
    evaluationItem: "Mathematical Reasoning",
    whatItTests: "Multi-step math problem solving",
    benchmarkMethod: "AIME 2025, MATH-500",
  },
  {
    evaluationItem: "Code Generation Quality",
    whatItTests: "Correct, clean, production-ready code",
    benchmarkMethod: "SWE-bench Verified, HumanEval+",
  },
  {
    evaluationItem: "Long-Context Accuracy",
    whatItTests: "Factual recall at 64K–1M tokens",
    benchmarkMethod: "Needle-in-a-Haystack, RULER",
  },
  {
    evaluationItem: "Instruction Following",
    whatItTests: "Adherence to complex, multi-constraint prompts",
    benchmarkMethod: "IFEval, custom 20-prompt suite",
  },
  {
    evaluationItem: "Structured Output",
    whatItTests: "Reliable JSON/XML/schema generation",
    benchmarkMethod: "100 extraction tasks, schema compliance %",
  },
  {
    evaluationItem: "Multi-Turn Reasoning",
    whatItTests: "Coherence over 10+ turn conversations",
    benchmarkMethod: "Custom dialogue suite, consistency score",
  },
  {
    evaluationItem: "Hallucination Rate",
    whatItTests: "Factual accuracy and calibration",
    benchmarkMethod: "TruthfulQA, SimpleQA, domain fact-check",
  },
  {
    evaluationItem: "Tool Use / Function Calling",
    whatItTests: "Correct tool selection and parameters",
    benchmarkMethod: "Berkeley Function Calling Benchmark",
  },
  {
    evaluationItem: "Cost Efficiency",
    whatItTests: "Quality-per-dollar on each task type",
    benchmarkMethod: "Normalize scores by $/1M tokens",
  },
  {
    evaluationItem: "Latency (TTFT + Total)",
    whatItTests: "Speed under real-world conditions",
    benchmarkMethod: "TTFT and total time across 100 calls",
  },
];

// ── Mapping: image item name → existing CriteriaId ───────────

const IMAGE_ITEM_TO_CRITERIA_ID: Record<string, string> = {
  "Mathematical Reasoning":      "math_reasoning",
  "Code Generation Quality":     "code_generation",
  "Long-Context Accuracy":       "long_context",
  "Instruction Following":       "instruction_following",
  "Structured Output":           "structured_output",
  "Multi-Turn Reasoning":        "multi_turn_reasoning",
  "Hallucination Rate":          "hallucination_rate",
  "Tool Use / Function Calling": "tool_use",
  "Cost Efficiency":             "cost_efficiency",
  "Latency (TTFT + Total)":      "latency",
};

// ── Merged criteria list ──────────────────────────────────────

/**
 * Existing criteria enriched with image-sourced descriptions and
 * benchmark methods. The original EVALUATION_CRITERIA is not modified.
 */
export const MERGED_EVALUATION_CRITERIA: EvaluationCriteria[] =
  EVALUATION_CRITERIA.map((c) => {
    const imgRow = IMAGE_CRITERIA_ROWS.find(
      (r) => IMAGE_ITEM_TO_CRITERIA_ID[r.evaluationItem] === c.id
    );
    if (!imgRow) return c;
    return {
      ...c,
      description: imgRow.whatItTests,
      benchmark: imgRow.benchmarkMethod,
    };
  });

/** Quick lookup by criteria id (merged) */
export const MERGED_CRITERIA_MAP: Record<string, EvaluationCriteria> =
  Object.fromEntries(MERGED_EVALUATION_CRITERIA.map((c) => [c.id, c]));
