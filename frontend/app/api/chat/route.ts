// ─────────────────────────────────────────────────────────────
//  POST /api/chat
//  Parses natural language evaluation requests and either
//  returns a structured plan or streams evaluation results
// ─────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { MODELS } from "@/data/models";
import { EVALUATION_CRITERIA } from "@/data/evaluationCriteria";
import type { CriteriaId } from "@/types/evaluation";

interface ChatRequest {
  message: string;
  modelIds?: string[];    // optional overrides
  criteriaIds?: string[];
}

interface ParsedIntent {
  modelIds: string[];
  criteriaIds: CriteriaId[];
  action: "evaluate" | "explain" | "help" | "unknown";
  responseText: string;
}

// ── NLP-style intent parser (no external LLM needed for routing) ──

function parseIntent(message: string): ParsedIntent {
  const lower = message.toLowerCase();

  // Detect model mentions
  const modelIds: string[] = [];
  for (const model of MODELS) {
    const nameLower = model.name.toLowerCase();
    if (
      lower.includes(nameLower) ||
      lower.includes(model.id) ||
      lower.includes(model.provider)
    ) {
      modelIds.push(model.id);
    }
  }

  // Detect criteria mentions
  const criteriaMap: Record<string, CriteriaId> = {
    "math": "math_reasoning",
    "mathematics": "math_reasoning",
    "reasoning": "math_reasoning",
    "code": "code_generation",
    "coding": "code_generation",
    "programming": "code_generation",
    "context": "long_context",
    "long context": "long_context",
    "instruction": "instruction_following",
    "follow": "instruction_following",
    "json": "structured_output",
    "xml": "structured_output",
    "structured": "structured_output",
    "multi-turn": "multi_turn_reasoning",
    "multi turn": "multi_turn_reasoning",
    "conversation": "multi_turn_reasoning",
    "hallucin": "hallucination_rate",
    "factual": "hallucination_rate",
    "tool": "tool_use",
    "function call": "tool_use",
    "agent": "tool_use",
    "cost": "cost_efficiency",
    "efficient": "cost_efficiency",
    "latency": "latency",
    "speed": "latency",
    "fast": "latency",
  };

  const foundCriteria = new Set<CriteriaId>();
  for (const [keyword, criteriaId] of Object.entries(criteriaMap)) {
    if (lower.includes(keyword)) {
      foundCriteria.add(criteriaId);
    }
  }

  // Detect action
  const isEvaluate =
    lower.includes("evaluat") ||
    lower.includes("benchmark") ||
    lower.includes("test") ||
    lower.includes("compare") ||
    lower.includes("run") ||
    lower.includes("assess");

  const isHelp =
    lower.includes("help") ||
    lower.includes("how") ||
    lower.includes("what can") ||
    lower.includes("what do");

  if (isHelp && !isEvaluate) {
    return {
      modelIds: [],
      criteriaIds: [],
      action: "help",
      responseText: buildHelpText(),
    };
  }

  if (!isEvaluate && modelIds.length === 0 && foundCriteria.size === 0) {
    return {
      modelIds: [],
      criteriaIds: [],
      action: "unknown",
      responseText:
        "I can help you evaluate LLM models. Try something like:\n\n" +
        "**\"Evaluate Claude Opus 4.6 and GPT-5.2 Thinking on math reasoning and code generation\"**\n\n" +
        "Or type **\"help\"** to see all available models and criteria.",
    };
  }

  // Default: all models or all criteria if not specified
  const finalModelIds = modelIds.length > 0
    ? modelIds
    : MODELS.slice(0, 3).map((m) => m.id); // default to first 3

  const finalCriteriaIds = foundCriteria.size > 0
    ? Array.from(foundCriteria)
    : (["math_reasoning", "code_generation", "instruction_following"] as CriteriaId[]);

  return {
    modelIds: finalModelIds,
    criteriaIds: finalCriteriaIds,
    action: "evaluate",
    responseText: buildEvalPlan(finalModelIds, finalCriteriaIds),
  };
}

function buildHelpText(): string {
  const modelList = MODELS.map((m) => `• **${m.name}** (${m.provider})`).join("\n");
  const criteriaList = EVALUATION_CRITERIA.map(
    (c) => `• **${c.name}** — ${c.description}`
  ).join("\n");

  return `## LLM Evaluation Platform

### Available Models
${modelList}

### Evaluation Criteria
${criteriaList}

### Example Commands
- *"Evaluate Claude Opus 4.6 and GPT-5.2 Thinking on math reasoning and code generation"*
- *"Compare all DeepSeek models for cost efficiency and latency"*
- *"Test Gemini 3 Pro on instruction following and structured output"*`;
}

function buildEvalPlan(modelIds: string[], criteriaIds: CriteriaId[]): string {
  const modelNames = modelIds
    .map((id) => MODELS.find((m) => m.id === id)?.name ?? id)
    .join(", ");

  const criteriaNames = criteriaIds
    .map((id) => EVALUATION_CRITERIA.find((c) => c.id === id)?.name ?? id)
    .join(", ");

  return (
    `**Evaluation Plan**\n\n` +
    `**Models:** ${modelNames}\n\n` +
    `**Criteria:** ${criteriaNames}\n\n` +
    `**Protocol:** 5 runs per test, temperature=0, averaged results\n\n` +
    `Click **Run Evaluation** to start the benchmark. Results will stream in real-time.`
  );
}

// ── Handler ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();

    if (!body.message?.trim()) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const parsed = parseIntent(body.message);

    // Allow caller to override parsed models/criteria
    const finalModelIds = body.modelIds?.length ? body.modelIds : parsed.modelIds;
    const finalCriteriaIds = body.criteriaIds?.length
      ? (body.criteriaIds as CriteriaId[])
      : parsed.criteriaIds;

    return NextResponse.json({
      action: parsed.action,
      responseText: parsed.responseText,
      modelIds: finalModelIds,
      criteriaIds: finalCriteriaIds,
    });
  } catch (error) {
    console.error("[chat] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat processing failed" },
      { status: 500 }
    );
  }
}
