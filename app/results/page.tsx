"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Heatmap from "@/components/Heatmap";
import ResultsTable from "@/components/ResultsTable";
import LatencyChart from "@/components/LatencyChart";
import { loadEvaluation } from "@/lib/evalStore";
import type { ModelEvaluationResult } from "@/types/evaluation";
import { BarChart3, Grid3X3, Table2, Clock, AlertCircle } from "lucide-react";
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

type Tab = "heatmap" | "radar" | "table" | "latency";

export default function ResultsPage() {
  const [results, setResults] = useState<ModelEvaluationResult[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("heatmap");

  useEffect(() => {
    const stored = loadEvaluation();
    if (stored?.results) setResults(stored.results);
  }, []);

  const tabs: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: "heatmap", label: "Heatmap",       Icon: Grid3X3  },
    { id: "radar",   label: "Radar Chart",   Icon: BarChart3 },
    { id: "table",   label: "Results Table", Icon: Table2   },
    { id: "latency", label: "Latency",       Icon: Clock    },
  ];

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
