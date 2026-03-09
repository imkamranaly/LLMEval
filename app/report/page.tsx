"use client";

import { useState, useEffect } from "react";
import { loadEvaluation } from "@/lib/evalStore";
import type { ModelEvaluationResult, RecommendationReport } from "@/types/evaluation";
import { FileDown, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { MERGED_CRITERIA_MAP as CRITERIA_MAP } from "@/data/imageCriteria";

export default function ReportPage() {
  const [results, setResults]               = useState<ModelEvaluationResult[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationReport | null>(null);
  const [isGenerating, setIsGenerating]     = useState(false);
  const [downloaded, setDownloaded]         = useState(false);
  const [error, setError]                   = useState("");

  useEffect(() => {
    const stored = loadEvaluation();
    if (stored) {
      setResults(stored.results);
      setRecommendations(stored.recommendations ?? null);
    }
  }, []);

  async function downloadReport() {
    if (!results.length) return;
    setIsGenerating(true);
    setError("");
    setDownloaded(false);

    try {
      const res = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results, recommendations }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "PDF generation failed");
      }

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `llm-evaluation-report-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <AlertCircle size={40} className="text-gray-300" />
        <div>
          <h2 className="text-lg font-semibold text-gray-700">No evaluation data</h2>
          <p className="text-sm text-gray-400 mt-1">
            Complete an evaluation first from the{" "}
            <Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Evaluation Report</h1>
        <p className="text-sm text-gray-500 mt-1">
          Preview and download your PDF benchmark report.
        </p>
      </div>

      {/* Download card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
            <FileDown className="text-blue-600" size={22} />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">LLM Benchmark Evaluation Report</h2>
            <p className="text-sm text-gray-500 mt-1">
              Includes heatmap, scores table, cost analysis, latency comparison, and recommendations.
            </p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs text-gray-500">
              <span className="bg-gray-100 px-2 py-1 rounded">
                {results.length} models
              </span>
              <span className="bg-gray-100 px-2 py-1 rounded">
                {results[0].criteriaResults.length} criteria
              </span>
              <span className="bg-gray-100 px-2 py-1 rounded">
                5 runs per test
              </span>
              <span className="bg-gray-100 px-2 py-1 rounded">
                PDF format
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={downloadReport}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors text-sm"
          >
            {isGenerating ? (
              <><Loader2 size={14} className="animate-spin" /> Generating PDF...</>
            ) : (
              <><FileDown size={14} /> Download PDF Report</>
            )}
          </button>

          {downloaded && (
            <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
              <CheckCircle2 size={16} />
              Downloaded successfully
            </span>
          )}
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>

      {/* Preview: Summary table */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Summary Preview</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="p-3 font-medium text-gray-600">Model</th>
                {results[0].criteriaResults.map((cr) => (
                  <th key={cr.criteriaId} className="p-3 font-medium text-gray-600 text-center whitespace-nowrap">
                    {(CRITERIA_MAP[cr.criteriaId]?.name ?? cr.criteriaId)
                      .split(" ")
                      .slice(0, 2)
                      .join(" ")}
                  </th>
                ))}
                <th className="p-3 font-bold text-gray-700 text-center">Overall</th>
                <th className="p-3 font-medium text-gray-600 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {[...results]
                .sort((a, b) => b.overallScore - a.overallScore)
                .map((r) => (
                  <tr key={r.modelId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900 whitespace-nowrap">
                      {r.modelName}
                    </td>
                    {r.criteriaResults.map((cr) => (
                      <td key={cr.criteriaId} className="p-3 text-center">
                        <span className={`inline-flex items-center justify-center w-9 h-6 rounded text-xs font-bold ${
                          cr.normalizedScore >= 75
                            ? "bg-emerald-100 text-emerald-800"
                            : cr.normalizedScore >= 50
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {cr.normalizedScore}
                        </span>
                      </td>
                    ))}
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center justify-center w-9 h-6 rounded text-xs font-bold bg-blue-100 text-blue-800">
                        {r.overallScore}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-gray-600 text-xs">
                      ${r.totalCostUSD.toFixed(4)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations preview */}
      {recommendations && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Recommendations</h2>
          <div className="space-y-3">
            {[
              recommendations.bestForCoding,
              recommendations.bestForMath,
              recommendations.bestForAgentTasks,
              recommendations.bestCostEfficient,
              recommendations.bestLongContext,
            ].map((rec) => (
              <div
                key={rec.category}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100"
              >
                <div className="min-w-[120px]">
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                    {rec.category}
                  </div>
                  <div className="font-medium text-gray-900 text-sm mt-0.5">
                    {rec.modelName}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{rec.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
