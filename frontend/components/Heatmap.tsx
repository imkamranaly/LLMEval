"use client";

import { useMemo } from "react";
import type { ModelEvaluationResult } from "@/types/evaluation";
import { CRITERIA_MAP } from "@/data/evaluationCriteria";
import clsx from "clsx";

interface Props {
  results: ModelEvaluationResult[];
}

function scoreToTailwind(score: number): string {
  if (score >= 85) return "bg-emerald-500 text-white";
  if (score >= 70) return "bg-emerald-300 text-emerald-900";
  if (score >= 55) return "bg-yellow-300 text-yellow-900";
  if (score >= 40) return "bg-orange-300 text-orange-900";
  return "bg-red-400 text-white";
}

function scoreToHex(score: number): string {
  if (score >= 85) return "#10b981";
  if (score >= 70) return "#6ee7b7";
  if (score >= 55) return "#fde047";
  if (score >= 40) return "#fdba74";
  return "#f87171";
}

export default function Heatmap({ results }: Props) {
  const { criteriaIds, criteriaNames } = useMemo(() => {
    if (!results[0]) return { criteriaIds: [], criteriaNames: [] };
    const ids = results[0].criteriaResults.map((c) => c.criteriaId);
    const names = ids.map((id) => CRITERIA_MAP[id]?.name ?? id);
    return { criteriaIds: ids, criteriaNames: names };
  }, [results]);

  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        No evaluation results yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="font-medium">Score scale:</span>
        {[
          { label: "≥85", color: "#10b981" },
          { label: "70-84", color: "#6ee7b7" },
          { label: "55-69", color: "#fde047" },
          { label: "40-54", color: "#fdba74" },
          { label: "<40", color: "#f87171" },
        ].map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded"
              style={{ backgroundColor: color }}
            />
            {label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[600px]">
          <thead>
            <tr>
              {/* Model name column */}
              <th className="text-left font-medium text-gray-600 pb-2 pr-3 min-w-[140px]">
                Model
              </th>
              {criteriaNames.map((name, i) => (
                <th
                  key={criteriaIds[i]}
                  className="text-center pb-2 px-1 font-medium text-gray-600 min-w-[70px]"
                  title={name}
                >
                  <div className="writing-mode-vertical truncate max-w-[60px] mx-auto">
                    {name.split(" ").slice(0, 2).join(" ")}
                  </div>
                </th>
              ))}
              <th className="text-center pb-2 px-1 font-bold text-gray-700 min-w-[70px]">
                Overall
              </th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.modelId} className="group">
                <td className="pr-3 py-1 font-medium text-gray-800 text-xs whitespace-nowrap">
                  {result.modelName}
                </td>
                {criteriaIds.map((cid) => {
                  const cr = result.criteriaResults.find((c) => c.criteriaId === cid);
                  const score = cr?.normalizedScore ?? 0;
                  return (
                    <td key={cid} className="px-1 py-1 text-center">
                      <div
                        className={clsx(
                          "mx-auto w-12 h-8 rounded flex items-center justify-center text-xs font-bold shadow-sm",
                          scoreToTailwind(score)
                        )}
                        title={`${result.modelName} — ${CRITERIA_MAP[cid]?.name}: ${score}/100`}
                      >
                        {score}
                      </div>
                    </td>
                  );
                })}
                {/* Overall */}
                <td className="px-1 py-1 text-center">
                  <div
                    className={clsx(
                      "mx-auto w-12 h-8 rounded flex items-center justify-center text-xs font-bold shadow ring-2 ring-offset-1",
                      scoreToTailwind(result.overallScore),
                      result.overallScore >= 70 ? "ring-emerald-400" : "ring-orange-300"
                    )}
                  >
                    {result.overallScore}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SVG colour-bar legend */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-gray-400">0</span>
        <svg width="200" height="12" className="rounded overflow-hidden">
          <defs>
            <linearGradient id="heatGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#f87171" />
              <stop offset="40%"  stopColor="#fde047" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <rect width="200" height="12" fill="url(#heatGrad)" />
        </svg>
        <span className="text-xs text-gray-400">100</span>
      </div>
    </div>
  );
}
