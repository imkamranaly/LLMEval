"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Heatmap from "@/components/Heatmap";
import LatencyChart from "@/components/LatencyChart";
import ResultsTable from "@/components/ResultsTable";
import {
  Clock,
  ChevronDown,
  ChevronUp,
  FileDown,
  Loader2,
  BarChart3,
  DollarSign,
  AlertCircle,
  History,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type { HistoricalReport, ModelEvaluationResult } from "@/types/evaluation";
import { loadHistory } from "@/lib/evalStore";
import Link from "next/link";

const RadarChart = dynamic(() => import("@/components/RadarChart"), {
  ssr: false,
  loading: () => (
    <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
      Loading chart...
    </div>
  ),
});

interface ReportSummary {
  id: string;
  timestamp: string;
  selectedModels: string[];
  selectedCriteria: string[];
  iterationsPerTest: number;
  temperature: number;
  totalCostUSD: number;
  averageLatencyMs: number;
  modelCount: number;
  scores: { modelId: string; modelName: string; overallScore: number }[];
}

type DetailTab = "heatmap" | "radar" | "table" | "latency";

function ReportCard({
  summary,
  onDelete,
}: {
  summary: ReportSummary;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded]   = useState(false);
  const [fullReport, setFull]     = useState<HistoricalReport | null>(null);
  const [loading, setLoading]     = useState(false);
  const [activeTab, setTab]       = useState<DetailTab>("heatmap");
  const [generating, setGen]      = useState(false);
  const [downloaded, setDl]       = useState(false);
  const [dlError, setDlErr]       = useState("");
  const [deleting, setDeleting]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function loadFull() {
    if (fullReport) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/history?id=${encodeURIComponent(summary.id)}`);
      if (res.ok) setFull(await res.json());
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    if (!expanded) loadFull();
    setExpanded((v) => !v);
  }

  async function downloadPDF() {
    if (!fullReport) return;
    setGen(true);
    setDlErr("");
    setDl(false);
    try {
      const res = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          results: fullReport.results,
          recommendations: fullReport.recommendations,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `llm-report-${summary.id.replace(/[:.]/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDl(true);
    } catch (e) {
      setDlErr(e instanceof Error ? e.message : String(e));
    } finally {
      setGen(false);
    }
  }

  async function confirmDelete() {
    setShowConfirm(false);
    setDeleting(true);
    try {
      await fetch(`/api/history?id=${encodeURIComponent(summary.id)}`, { method: "DELETE" });
    } catch { /* best-effort */ }
    onDelete(summary.id);
  }

  const tabs: { id: DetailTab; label: string }[] = [
    { id: "heatmap", label: "Heatmap"       },
    { id: "radar",   label: "Radar"         },
    { id: "table",   label: "Scores Table"  },
    { id: "latency", label: "Latency/Cost"  },
  ];

  const date  = new Date(summary.timestamp);
  const label = date.toLocaleString();
  const best  = summary.scores.length
    ? [...summary.scores].sort((a, b) => b.overallScore - a.overallScore)[0]
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Summary header — div (not button) so delete button nests correctly */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => e.key === "Enter" && toggle()}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <History size={16} className="text-blue-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">{label}</div>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="text-xs text-gray-500">
                {summary.modelCount} model{summary.modelCount !== 1 ? "s" : ""}
              </span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-500">
                {summary.selectedCriteria.length} criteria
              </span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-500">
                {summary.iterationsPerTest} iterations · temp={summary.temperature}
              </span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-500">
                ${summary.totalCostUSD.toFixed(4)} total
              </span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-500">
                {summary.averageLatencyMs}ms avg latency
              </span>
            </div>
            {/* Model scores pills */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {summary.scores.map((s) => (
                <span
                  key={s.modelId}
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                    s.overallScore >= 75
                      ? "bg-emerald-100 text-emerald-800"
                      : s.overallScore >= 50
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {s.modelName}: {s.overallScore}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          {best && (
            <div className="hidden sm:block text-right mr-1">
              <div className="text-xs text-gray-400">Best</div>
              <div className="text-sm font-bold text-blue-700">{best.modelName}</div>
            </div>
          )}
          {/* Delete button — proper button element, stops propagation to parent div */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
            disabled={deleting}
            title="Delete this report"
            className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 size={15} className="animate-spin text-red-500" />
            ) : (
              <Trash2 size={15} />
            )}
          </button>
          {expanded ? (
            <ChevronUp size={18} className="text-gray-400" />
          ) : (
            <ChevronDown size={18} className="text-gray-400" />
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setShowConfirm(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Dialog */}
          <div
            className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <Trash2 size={22} className="text-red-600" />
            </div>

            {/* Text */}
            <h3 className="text-base font-semibold text-gray-900 text-center">
              Delete this report?
            </h3>
            <p className="text-sm text-gray-500 text-center mt-1.5">
              <span className="font-medium text-gray-700">{label}</span>
              <br />
              This action cannot be undone.
            </p>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-medium text-white transition-colors"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-4 justify-center">
              <Loader2 size={16} className="animate-spin" />
              Loading report details...
            </div>
          )}

          {!loading && !fullReport && (
            <div className="text-sm text-gray-400 text-center py-4">
              Could not load full report from server. Historical data may be unavailable.
            </div>
          )}

          {fullReport && (
            <>
              {/* Action bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={downloadPDF}
                  disabled={generating}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  {generating ? (
                    <><Loader2 size={12} className="animate-spin" /> Generating...</>
                  ) : (
                    <><FileDown size={12} /> Download PDF</>
                  )}
                </button>
                {downloaded && (
                  <span className="text-xs text-emerald-600 font-medium">Downloaded ✓</span>
                )}
                {dlError && (
                  <span className="text-xs text-red-500">{dlError}</span>
                )}

                {/* Tab switcher */}
                <div className="ml-auto flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                  {tabs.map(({ id, label: lbl }) => (
                    <button
                      key={id}
                      onClick={() => setTab(id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        activeTab === id
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart area */}
              <div className="bg-gray-50 rounded-lg p-4 min-h-[280px]">
                {activeTab === "heatmap" && (
                  <Heatmap results={fullReport.results} />
                )}
                {activeTab === "radar" && (
                  <RadarChart results={fullReport.results} />
                )}
                {activeTab === "table" && (
                  <ResultsTable results={fullReport.results} />
                )}
                {activeTab === "latency" && (
                  <LatencyChart results={fullReport.results} />
                )}
              </div>

              {/* Iteration summary per model */}
              <IterationDetails results={fullReport.results} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function IterationDetails({ results }: { results: ModelEvaluationResult[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium"
      >
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {open ? "Hide" : "Show"} per-iteration scores
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {results.map((model) => (
            <div key={model.modelId}>
              <div className="text-xs font-semibold text-gray-700 mb-1">{model.modelName}</div>
              <div className="overflow-x-auto">
                <table className="text-xs w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600">
                      <th className="px-2 py-1 text-left font-medium">Criteria</th>
                      {Array.from({ length: 5 }, (_, i) => (
                        <th key={i} className="px-2 py-1 text-center font-medium">Run {i + 1}</th>
                      ))}
                      <th className="px-2 py-1 text-center font-medium">Avg</th>
                      <th className="px-2 py-1 text-center font-medium">StdDev</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.criteriaResults.map((cr) => (
                      <tr key={cr.criteriaId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-2 py-1 text-gray-700 whitespace-nowrap capitalize">
                          {cr.criteriaId.replace(/_/g, " ")}
                        </td>
                        {Array.from({ length: 5 }, (_, i) => {
                          const run = cr.runs.find((r) => r.runIndex === i);
                          return (
                            <td key={i} className="px-2 py-1 text-center">
                              {run != null ? (
                                <span className={`inline-block w-7 text-center rounded font-bold ${
                                  run.score >= 75
                                    ? "bg-emerald-100 text-emerald-800"
                                    : run.score >= 50
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                                }`}>
                                  {run.score}
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-2 py-1 text-center font-bold text-blue-700">
                          {cr.averageScore}
                        </td>
                        <td className="px-2 py-1 text-center text-gray-500">
                          ±{cr.stdDev}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const [reports, setReports]   = useState<ReportSummary[]>([]);
  const [loading, setLoading]   = useState(true);

  function handleDelete(id: string) {
    setReports((prev) => prev.filter((r) => r.id !== id));
    // Purge from localStorage history cache too
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("llm_eval_history");
        if (raw) {
          const all: HistoricalReport[] = JSON.parse(raw);
          localStorage.setItem(
            "llm_eval_history",
            JSON.stringify(all.filter((r) => r.id !== id))
          );
        }
      } catch { /* ignore */ }
    }
  }

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      // Prefer server-side list (persisted JSON files)
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        if (data.reports?.length) {
          setReports(data.reports);
          setLoading(false);
          return;
        }
      }
    } catch { /* fall through to localStorage */ }

    // Fallback: localStorage history cache
    const cached = loadHistory();
    setReports(
      cached.map((r) => ({
        id: r.id,
        timestamp: r.timestamp,
        selectedModels: r.selectedModels,
        selectedCriteria: r.selectedCriteria,
        iterationsPerTest: r.iterationsPerTest,
        temperature: r.temperature,
        totalCostUSD: r.totalCostUSD,
        averageLatencyMs: r.averageLatencyMs,
        modelCount: r.results?.length ?? 0,
        scores: (r.results ?? []).map((res) => ({
          modelId: res.modelId,
          modelName: res.modelName,
          overallScore: res.overallScore,
        })),
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Evaluation History</h1>
          <p className="text-sm text-gray-500 mt-1">
            All previous evaluation runs. Click the trash icon to delete a report.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchReports}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + New Evaluation
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      {reports.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<History size={16} className="text-blue-600" />}
            label="Total Runs"
            value={String(reports.length)}
            color="blue"
          />
          <StatCard
            icon={<BarChart3 size={16} className="text-purple-600" />}
            label="Unique Models"
            value={String(
              new Set(reports.flatMap((r) => r.selectedModels)).size
            )}
            color="purple"
          />
          <StatCard
            icon={<DollarSign size={16} className="text-emerald-600" />}
            label="Total Spent"
            value={`$${reports.reduce((s, r) => s + r.totalCostUSD, 0).toFixed(4)}`}
            color="emerald"
          />
          <StatCard
            icon={<Clock size={16} className="text-amber-600" />}
            label="Avg Latency"
            value={
              reports.length
                ? `${Math.round(
                    reports.reduce((s, r) => s + r.averageLatencyMs, 0) /
                      reports.length
                  )}ms`
                : "—"
            }
            color="amber"
          />
        </div>
      )}

      {/* Report list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Loading history...</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <AlertCircle size={40} className="text-gray-300" />
          <div>
            <h2 className="text-lg font-semibold text-gray-700">No history yet</h2>
            <p className="text-sm text-gray-400 mt-1">
              Run an evaluation from the{" "}
              <Link href="/dashboard" className="text-blue-600 hover:underline">
                Dashboard
              </Link>{" "}
              to start building history.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <ReportCard key={r.id} summary={r} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "blue" | "purple" | "emerald" | "amber";
}) {
  const bg: Record<string, string> = {
    blue:    "bg-blue-50 border-blue-100",
    purple:  "bg-purple-50 border-purple-100",
    emerald: "bg-emerald-50 border-emerald-100",
    amber:   "bg-amber-50 border-amber-100",
  };
  return (
    <div className={`rounded-xl border p-4 ${bg[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="font-bold text-gray-900 text-lg">{value}</div>
    </div>
  );
}
