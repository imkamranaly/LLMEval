"use client";

import {
  RadarChart as RechartsRadar,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ModelEvaluationResult } from "@/types/evaluation";
import { CRITERIA_MAP } from "@/data/evaluationCriteria";

interface Props {
  results: ModelEvaluationResult[];
}

const CHART_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16",
  "#f97316", "#6366f1",
];

export default function RadarChart({ results }: Props) {
  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        No results to display
      </div>
    );
  }

  // Build data: one entry per criteria axis
  const criteriaIds = results[0].criteriaResults.map((c) => c.criteriaId);

  const data = criteriaIds.map((cid) => {
    const entry: Record<string, string | number> = {
      subject: (CRITERIA_MAP[cid]?.name ?? cid).split(" ").slice(0, 2).join(" "),
    };
    for (const result of results) {
      const cr = result.criteriaResults.find((c) => c.criteriaId === cid);
      entry[result.modelName] = cr?.normalizedScore ?? 0;
    }
    return entry;
  });

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RechartsRadar data={data} outerRadius="70%">
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fontSize: 11, fill: "#6b7280" }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 100]}
          tick={{ fontSize: 9, fill: "#9ca3af" }}
          tickCount={5}
        />
        {results.map((result, index) => (
          <Radar
            key={result.modelId}
            name={result.modelName}
            dataKey={result.modelName}
            stroke={CHART_COLORS[index % CHART_COLORS.length]}
            fill={CHART_COLORS[index % CHART_COLORS.length]}
            fillOpacity={0.08}
            strokeWidth={2}
          />
        ))}
        <Tooltip
          formatter={(value, name) => [`${Number(value)}/100`, String(name)]}
          contentStyle={{
            fontSize: 11,
            borderRadius: 8,
            border: "1px solid #e5e7eb",
          }}
        />
        <Legend
          iconSize={10}
          wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
        />
      </RechartsRadar>
    </ResponsiveContainer>
  );
}
