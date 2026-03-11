// ─────────────────────────────────────────────────────────────
//  Client-side evaluation store — persists results in localStorage
//  so all pages share the same evaluation state.
//
//  History is append-only: previous runs are never overwritten.
// ─────────────────────────────────────────────────────────────
import type {
  ModelEvaluationResult,
  RecommendationReport,
  HistoricalReport,
} from "@/types/evaluation";

const STORAGE_KEY  = "llm_eval_results";
const RECS_KEY     = "llm_eval_recommendations";
const HISTORY_KEY  = "llm_eval_history";

// ── Current evaluation (most recent run) ─────────────────────

export interface StoredEvaluation {
  results: ModelEvaluationResult[];
  recommendations?: RecommendationReport;
  savedAt: string;
}

export function saveEvaluation(
  results: ModelEvaluationResult[],
  recommendations?: RecommendationReport
) {
  if (typeof window === "undefined") return;
  const data: StoredEvaluation = {
    results,
    recommendations,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadEvaluation(): StoredEvaluation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearEvaluation() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(RECS_KEY);
}

// ── Evaluation history (all runs, append-only) ────────────────

/** Append a report to the history. Duplicate ids are deduplicated. */
export function saveToHistory(report: HistoricalReport) {
  if (typeof window === "undefined") return;
  const existing = loadHistory();
  const updated = [report, ...existing.filter((r) => r.id !== report.id)];
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

/** Return all historical reports, newest first. */
export function loadHistory(): HistoricalReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoricalReport[]) : [];
  } catch {
    return [];
  }
}
