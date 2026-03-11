"use client";

import { useState, useEffect } from "react";
import ModelSelector from "@/components/ModelSelector";
import CriteriaSelector from "@/components/CriteriaSelector";
import { Play, Loader2, BarChart3, DollarSign, Clock, Trophy } from "lucide-react";
import type { CriteriaId, ModelEvaluationResult, RecommendationReport, HistoricalReport } from "@/types/evaluation";
import { saveEvaluation, loadEvaluation, saveToHistory } from "@/lib/evalStore";
import Link from "next/link";

export default function DashboardPage() {
  const [selectedModels, setSelectedModels]   = useState<string[]>([]);
  const [selectedCriteria, setSelectedCriteria] = useState<CriteriaId[]>([]);
  const [isRunning, setIsRunning]             = useState(false);
  const [progress, setProgress]               = useState("");
  const [progressPct, setProgressPct]         = useState(0);
  const [results, setResults]                 = useState<ModelEvaluationResult[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationReport | null>(null);

  // Load persisted results on mount
  useEffect(() => {
    const stored = loadEvaluation();
    if (stored) {
      setResults(stored.results);
      setRecommendations(stored.recommendations ?? null);
    }
  }, []);

  async function runEvaluation() {
    if (!selectedModels.length || !selectedCriteria.length) return;
    setIsRunning(true);
    setProgress("Connecting...");
    setProgressPct(0);

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelIds: selectedModels,
          criteriaIds: selectedCriteria,
        }),
      });

      if (!res.body) throw new Error("No stream");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const eventMatch = chunk.match(/^event: (\w+)/m);
          const dataMatch  = chunk.match(/^data: (.+)/m);
          if (!eventMatch || !dataMatch) continue;

          const event = eventMatch[1];
          const data  = JSON.parse(dataMatch[1]);

          if (event === "progress" || event === "status") {
            setProgress(data.message ?? "");
            setProgressPct(data.progress ?? 0);
          } else if (event === "complete") {
            setResults(data.results);
            setRecommendations(data.recommendations);
            saveEvaluation(data.results, data.recommendations);
            // Save to client-side history cache
            const reportId: string = data.reportId ?? new Date().toISOString();
            const histReport: HistoricalReport = {
              id: reportId,
              timestamp: reportId,
              selectedModels,
              selectedCriteria,
              results: data.results,
              recommendations: data.recommendations,
              heatmap: data.heatmap,
              iterationsPerTest: 5,
              temperature: 0,
              totalCostUSD: (data.results as ModelEvaluationResult[]).reduce(
                (s, r) => s + r.totalCostUSD, 0
              ),
              averageLatencyMs: Math.round(
                (data.results as ModelEvaluationResult[]).reduce(
                  (s, r) => s + r.averageLatencyMs, 0
                ) / Math.max(data.results.length, 1)
              ),
            };
            saveToHistory(histReport);
            setIsRunning(false);
            setProgress("");
          } else if (event === "error") {
            setIsRunning(false);
            setProgress(`Error: ${data.message}`);
          }
        }
      }
    } catch (err) {
      setIsRunning(false);
      setProgress(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const bestModel = results.length
    ? [...results].sort((a, b) => b.overallScore - a.overallScore)[0]
    : null;

  const cheapest = results.length
    ? [...results].sort((a, b) => a.totalCostUSD - b.totalCostUSD)[0]
    : null;

  const fastest = results.length
    ? [...results].sort((a, b) => a.averageLatencyMs - b.averageLatencyMs)[0]
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Evaluation Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Select models and criteria, then run the benchmark suite.
        </p>
      </div>

      {/* Summary cards (if results exist) */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            icon={<Trophy className="text-amber-500" size={18} />}
            label="Best Overall"
            value={bestModel?.modelName ?? "—"}
            sub={`${bestModel?.overallScore ?? 0}/100`}
            color="amber"
          />
          <SummaryCard
            icon={<DollarSign className="text-emerald-500" size={18} />}
            label="Most Cost-Efficient"
            value={cheapest?.modelName ?? "—"}
            sub={`$${cheapest?.totalCostUSD.toFixed(4) ?? "0"}`}
            color="emerald"
          />
          <SummaryCard
            icon={<Clock className="text-blue-500" size={18} />}
            label="Fastest Response"
            value={fastest?.modelName ?? "—"}
            sub={`${fastest?.averageLatencyMs ?? 0}ms avg`}
            color="blue"
          />
          <SummaryCard
            icon={<BarChart3 className="text-purple-500" size={18} />}
            label="Models Tested"
            value={String(results.length)}
            sub={`${results[0]?.criteriaResults.length ?? 0} criteria`}
            color="purple"
          />
        </div>
      )}

      {/* Two-column selector layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <ModelSelector
            selectedIds={selectedModels}
            onChange={setSelectedModels}
          />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <CriteriaSelector
            selectedIds={selectedCriteria}
            onChange={setSelectedCriteria}
          />
        </div>
      </div>

      {/* Run button */}
      <div className="flex items-center gap-4">
        <button
          onClick={runEvaluation}
          disabled={isRunning || !selectedModels.length || !selectedCriteria.length}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors shadow-sm"
        >
          {isRunning ? (
            <><Loader2 size={16} className="animate-spin" /> Running...</>
          ) : (
            <><Play size={16} /> Run Evaluation</>
          )}
        </button>

        {results.length > 0 && !isRunning && (
          <Link
            href="/results"
            className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-xl transition-colors text-sm"
          >
            View Full Results →
          </Link>
        )}

        {selectedModels.length === 0 && (
          <p className="text-sm text-gray-400">Select at least one model to continue</p>
        )}
      </div>

      {/* Progress bar */}
      {isRunning && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-gray-600 font-medium">Evaluation in progress</span>
            <span className="text-gray-400">{progressPct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {progress && (
            <p className="text-xs text-gray-400 mt-2 font-mono truncate">{progress}</p>
          )}
        </div>
      )}

      {/* Recommendations */}
      {recommendations && !isRunning && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy size={16} className="text-amber-500" />
            Recommendations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              recommendations.bestForCoding,
              recommendations.bestForMath,
              recommendations.bestForAgentTasks,
              recommendations.bestCostEfficient,
              recommendations.bestLongContext,
            ].map((rec) => (
              <div key={rec.category} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                  {rec.category}
                </div>
                <div className="font-medium text-gray-900 text-sm">{rec.modelName}</div>
                <div className="text-xs text-gray-500 mt-0.5">{rec.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: "amber" | "emerald" | "blue" | "purple";
}) {
  const bg: Record<string, string> = {
    amber: "bg-amber-50 border-amber-100",
    emerald: "bg-emerald-50 border-emerald-100",
    blue: "bg-blue-50 border-blue-100",
    purple: "bg-purple-50 border-purple-100",
  };

  return (
    <div className={`rounded-xl border p-4 ${bg[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="font-bold text-gray-900 text-sm truncate">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{sub}</div>
    </div>
  );
}
