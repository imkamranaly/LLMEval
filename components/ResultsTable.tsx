"use client";

import type { ModelEvaluationResult } from "@/types/evaluation";
import { CRITERIA_MAP } from "@/data/evaluationCriteria";
import clsx from "clsx";

interface Props {
  results: ModelEvaluationResult[];
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={clsx(
      "inline-flex items-center justify-center w-10 h-6 rounded text-xs font-bold",
      score >= 75 ? "bg-emerald-100 text-emerald-800" :
      score >= 50 ? "bg-yellow-100 text-yellow-800" :
                   "bg-red-100 text-red-800"
    )}>
      {score}
    </span>
  );
}

export default function ResultsTable({ results }: Props) {
  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        No results yet
      </div>
    );
  }

  const criteriaIds = results[0].criteriaResults.map((c) => c.criteriaId);

  // Sort by overall score desc
  const sorted = [...results].sort((a, b) => b.overallScore - a.overallScore);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left p-3 font-medium text-gray-600 whitespace-nowrap">#</th>
            <th className="text-left p-3 font-medium text-gray-600 whitespace-nowrap">Model</th>
            <th className="text-left p-3 font-medium text-gray-600 whitespace-nowrap">Provider</th>
            {criteriaIds.map((cid) => (
              <th key={cid} className="text-center p-3 font-medium text-gray-600 min-w-[80px]" title={CRITERIA_MAP[cid]?.name}>
                {(CRITERIA_MAP[cid]?.name ?? cid).split(" ").slice(0, 2).join(" ")}
              </th>
            ))}
            <th className="text-center p-3 font-bold text-gray-700 whitespace-nowrap">Overall</th>
            <th className="text-right p-3 font-medium text-gray-600 whitespace-nowrap">Cost (USD)</th>
            <th className="text-right p-3 font-medium text-gray-600 whitespace-nowrap">Latency</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((result, index) => (
            <tr
              key={result.modelId}
              className={clsx(
                "border-b border-gray-100 hover:bg-gray-50 transition-colors",
                index === 0 ? "bg-emerald-50/40" : ""
              )}
            >
              <td className="p-3 text-gray-400 font-mono">
                {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
              </td>
              <td className="p-3 font-medium text-gray-900 whitespace-nowrap">
                {result.modelName}
              </td>
              <td className="p-3 text-gray-500 capitalize whitespace-nowrap">
                {result.provider}
              </td>
              {criteriaIds.map((cid) => {
                const cr = result.criteriaResults.find((c) => c.criteriaId === cid);
                return (
                  <td key={cid} className="p-3 text-center">
                    <ScoreBadge score={cr?.normalizedScore ?? 0} />
                  </td>
                );
              })}
              <td className="p-3 text-center">
                <ScoreBadge score={result.overallScore} />
              </td>
              <td className="p-3 text-right font-mono text-sm text-gray-600 whitespace-nowrap">
                ${result.totalCostUSD.toFixed(4)}
              </td>
              <td className="p-3 text-right font-mono text-sm text-gray-600 whitespace-nowrap">
                {result.averageLatencyMs.toLocaleString()}ms
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
