"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ModelEvaluationResult } from "@/types/evaluation";

interface Props {
  results: ModelEvaluationResult[];
}

function latencyColor(ms: number): string {
  if (ms < 1000) return "#10b981";
  if (ms < 3000) return "#f59e0b";
  return "#ef4444";
}

export default function LatencyChart({ results }: Props) {
  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No results to display
      </div>
    );
  }

  const data = results.map((r) => ({
    name: r.modelName.split(" ").slice(0, 2).join(" "),
    latency: r.averageLatencyMs,
    color: latencyColor(r.averageLatencyMs),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11 }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tickFormatter={(v) => `${v}ms`}
          tick={{ fontSize: 11 }}
          label={{
            value: "Avg Latency (ms)",
            angle: -90,
            position: "insideLeft",
            style: { fontSize: 11, fill: "#9ca3af" },
          }}
        />
        <Tooltip
          formatter={(value) => [`${Number(value).toLocaleString()} ms`, "Avg Latency"]}
          contentStyle={{ fontSize: 11, borderRadius: 8 }}
        />
        <Bar dataKey="latency" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
