// ─────────────────────────────────────────────────────────────
//  Evaluation criteria registry — add / remove criteria here
// ─────────────────────────────────────────────────────────────
import type { EvaluationCriteria } from "@/types/evaluation";

export const EVALUATION_CRITERIA: EvaluationCriteria[] = [
  {
    id: "math_reasoning",
    name: "Mathematical Reasoning",
    description:
      "Multi-step mathematical problem solving, arithmetic, algebra, and proof construction",
    benchmark: "AIME 2025 + MATH-500",
    weight: 0.12,
  },
  {
    id: "code_generation",
    name: "Code Generation Quality",
    description:
      "Production-quality code correctness, test coverage, and software engineering best practices",
    benchmark: "SWE-bench Verified + HumanEval+",
    weight: 0.14,
  },
  {
    id: "long_context",
    name: "Long Context Accuracy",
    description:
      "Accurate recall and reasoning over very long documents (100k+ tokens)",
    benchmark: "Needle in a Haystack + RULER",
    weight: 0.10,
  },
  {
    id: "instruction_following",
    name: "Instruction Following",
    description:
      "Precise adherence to complex, multi-constraint prompts and formatting instructions",
    benchmark: "IFEval + Custom Prompt Suite",
    weight: 0.10,
  },
  {
    id: "structured_output",
    name: "Structured Output",
    description:
      "JSON / XML schema compliance, consistent structured data extraction from unstructured text",
    benchmark: "Schema Extraction Tasks + JSON-mode benchmarks",
    weight: 0.08,
  },
  {
    id: "multi_turn_reasoning",
    name: "Multi-Turn Reasoning",
    description:
      "Consistency and coherence across extended multi-turn dialogues and evolving context",
    benchmark: "Custom Dialogue Suite + MT-Bench",
    weight: 0.10,
  },
  {
    id: "hallucination_rate",
    name: "Hallucination Rate",
    description:
      "Factual reliability — lower hallucination rate produces a higher score",
    benchmark: "TruthfulQA + SimpleQA",
    weight: 0.12,
  },
  {
    id: "tool_use",
    name: "Tool Use / Function Calling",
    description:
      "Correct identification, invocation, and chaining of tools / function calls",
    benchmark: "Berkeley Function Calling Benchmark (BFCL)",
    weight: 0.10,
  },
  {
    id: "cost_efficiency",
    name: "Cost Efficiency",
    description:
      "Performance score normalized by total token cost — higher is better value",
    benchmark: "Composite score / cost-per-1k-tokens",
    weight: 0.08,
  },
  {
    id: "latency",
    name: "Latency",
    description:
      "Time-to-first-token (TTFT) and total response time under controlled conditions",
    benchmark: "TTFT + E2E latency benchmark",
    weight: 0.06,
  },
];

/** Quick lookup by criteria id */
export const CRITERIA_MAP: Record<string, EvaluationCriteria> = Object.fromEntries(
  EVALUATION_CRITERIA.map((c) => [c.id, c])
);
