"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Heatmap from "@/components/Heatmap";
import ResultsTable from "@/components/ResultsTable";
import LatencyChart from "@/components/LatencyChart";
import { loadEvaluation } from "@/lib/evalStore";
import type { ModelEvaluationResult } from "@/types/evaluation";
import { CRITERIA_MAP } from "@/data/evaluationCriteria";
import { BarChart3, Grid3X3, Table2, Clock, AlertCircle, FlaskConical, ChevronDown } from "lucide-react";
import Link from "next/link";

// Radar chart uses recharts — lazy load to avoid SSR issues
const RadarChart = dynamic(() => import("@/components/RadarChart"), {
  ssr: false,
  loading: () => (
    <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
      Loading chart...
    </div>
  ),
});

type Tab = "heatmap" | "radar" | "table" | "latency" | "cases";

function scoreColor(score: number) {
  if (score >= 75) return "bg-green-500";
  if (score >= 50) return "bg-yellow-400";
  return "bg-red-500";
}

function scoreTextColor(score: number) {
  if (score >= 75) return "text-green-700";
  if (score >= 50) return "text-yellow-700";
  return "text-red-600";
}

export default function ResultsPage() {
  const [results, setResults] = useState<ModelEvaluationResult[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("heatmap");
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = loadEvaluation();
    if (stored?.results) setResults(stored.results);
  }, []);

  const tabs: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: "heatmap", label: "Heatmap",       Icon: Grid3X3     },
    { id: "radar",   label: "Radar Chart",   Icon: BarChart3   },
    { id: "table",   label: "Results Table", Icon: Table2      },
    { id: "latency", label: "Latency",       Icon: Clock       },
    { id: "cases",   label: "Test Cases",    Icon: FlaskConical },
  ];

  function toggleCriteria(id: string) {
    setExpandedCriteria((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <AlertCircle size={40} className="text-gray-300" />
        <div>
          <h2 className="text-lg font-semibold text-gray-700">No results yet</h2>
          <p className="text-sm text-gray-400 mt-1">
            Run an evaluation from the{" "}
            <Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
            {" "}or{" "}
            <Link href="/chat" className="text-blue-600 hover:underline">Chat</Link>
            {" "}page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Evaluation Results</h1>
          <p className="text-sm text-gray-500 mt-1">
            {results.length} model{results.length !== 1 ? "s" : ""} evaluated
            across {results[0].criteriaResults.length} criteria
          </p>
        </div>
        <Link
          href="/report"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Download Report →
        </Link>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm min-h-[400px]">
        {activeTab === "heatmap" && (
          <div>
            <h2 className="font-semibold text-gray-800 mb-4">
              Score Heatmap — Models × Criteria
            </h2>
            <Heatmap results={results} />
          </div>
        )}

        {activeTab === "radar" && (
          <div>
            <h2 className="font-semibold text-gray-800 mb-4">
              Strength Profile Radar
            </h2>
            <RadarChart results={results} />
          </div>
        )}

        {activeTab === "table" && (
          <div>
            <h2 className="font-semibold text-gray-800 mb-4">
              Detailed Scores
            </h2>
            <ResultsTable results={results} />
          </div>
        )}

        {activeTab === "cases" && (
          <div>
            <h2 className="font-semibold text-gray-800 mb-1">Test Case Breakdown</h2>
            <p className="text-xs text-gray-500 mb-4">
              5 benchmark cases per criteria — scores averaged across all 5 runs (temperature = 0)
            </p>

            <div className="space-y-3">
              {results[0]?.criteriaResults
                .filter((cr) => cr.caseResults && cr.caseResults.length > 0)
                .map((cr) => {
                  const criteriaName = CRITERIA_MAP[cr.criteriaId]?.name ?? cr.criteriaId;
                  const isExpanded = expandedCriteria.has(cr.criteriaId);

                  return (
                    <div key={cr.criteriaId} className="border border-gray-200 rounded-xl overflow-hidden">
                      {/* Criteria header */}
                      <button
                        onClick={() => toggleCriteria(cr.criteriaId)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-sm text-gray-800">{criteriaName}</span>
                          <span className="text-xs text-gray-500">{cr.caseResults.length} cases</span>
                        </div>
                        <ChevronDown
                          size={16}
                          className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </button>

                      {/* Case rows */}
                      {isExpanded && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-100 bg-white">
                                <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs w-6">#</th>
                                <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Case</th>
                                <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Expected Answer / Rubric</th>
                                {results.map((r) => (
                                  <th key={r.modelId} className="text-center px-3 py-2 font-medium text-gray-500 text-xs whitespace-nowrap">
                                    {r.modelName.split(" ").slice(0, 2).join(" ")}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {cr.caseResults.map((c, idx) => (
                                <tr key={c.promptId} className="border-b border-gray-50 hover:bg-gray-50">
                                  <td className="px-4 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                                  <td className="px-4 py-2.5">
                                    <div className="font-medium text-gray-800 text-xs">{c.label}</div>
                                    <div className="text-xs text-gray-400 font-mono">{c.promptId}</div>
                                  </td>
                                  <td className="px-4 py-2.5 max-w-xs">
                                    {c.expectedAnswer ? (
                                      <span className="text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded font-mono">
                                        {c.expectedAnswer.length > 60
                                          ? c.expectedAnswer.slice(0, 60) + "…"
                                          : c.expectedAnswer}
                                      </span>
                                    ) : c.rubric ? (
                                      <span className="text-xs text-blue-700 italic">
                                        {c.rubric.length > 80 ? c.rubric.slice(0, 80) + "…" : c.rubric}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-300">—</span>
                                    )}
                                  </td>
                                  {results.map((r) => {
                                    const modelCr = r.criteriaResults.find((x) => x.criteriaId === cr.criteriaId);
                                    const modelCase = modelCr?.caseResults.find((x) => x.promptId === c.promptId);
                                    const score = modelCase?.averageScore ?? 0;
                                    return (
                                      <td key={r.modelId} className="px-3 py-2.5 text-center">
                                        <span className={`inline-block min-w-[36px] px-2 py-0.5 rounded-full text-xs font-bold text-white ${scoreColor(score)}`}>
                                          {score}
                                        </span>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {activeTab === "latency" && (
          <div>
            <h2 className="font-semibold text-gray-800 mb-4">
              Average Latency Comparison
            </h2>
            <LatencyChart results={results} />

            {/* Cost table */}
            <div className="mt-6">
              <h3 className="font-medium text-gray-700 mb-3 text-sm uppercase tracking-wide">
                Cost Analysis
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="pb-2 font-medium text-gray-600">Model</th>
                      <th className="pb-2 font-medium text-gray-600 text-right">Total Tokens</th>
                      <th className="pb-2 font-medium text-gray-600 text-right">Total Cost</th>
                      <th className="pb-2 font-medium text-gray-600 text-right">Cost/Score pt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...results]
                      .sort((a, b) => a.totalCostUSD - b.totalCostUSD)
                      .map((r) => {
                        const totalTokens = r.criteriaResults.reduce(
                          (s, c) => s + c.totalTokensUsed,
                          0
                        );
                        const costPerPoint =
                          r.overallScore > 0
                            ? (r.totalCostUSD / r.overallScore) * 1000
                            : 0;
                        return (
                          <tr key={r.modelId} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 font-medium">{r.modelName}</td>
                            <td className="py-2 text-right font-mono text-gray-600">
                              {totalTokens.toLocaleString()}
                            </td>
                            <td className="py-2 text-right font-mono text-gray-600">
                              ${r.totalCostUSD.toFixed(6)}
                            </td>
                            <td className="py-2 text-right font-mono text-gray-600">
                              ${costPerPoint.toFixed(4)}/pt
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
