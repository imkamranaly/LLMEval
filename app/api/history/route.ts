// ─────────────────────────────────────────────────────────────
//  GET /api/history          — list all stored reports (summaries)
//  GET /api/history?id=<id>  — return one full report
// ─────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { listReports, getReport, deleteReport } from "@/lib/serverReportStore";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const ok = await deleteReport(id);
  if (!ok) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");

  if (id) {
    const report = await getReport(id);
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    return NextResponse.json(report);
  }

  // Return summary list — omit full results to keep response small
  const all = await listReports();
  const summaries = all.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    selectedModels: r.selectedModels,
    selectedCriteria: r.selectedCriteria,
    iterationsPerTest: r.iterationsPerTest,
    temperature: r.temperature,
    totalCostUSD: r.totalCostUSD,
    averageLatencyMs: r.averageLatencyMs,
    modelCount: r.results?.length ?? 0,
    // Include top-level scores for quick display
    scores: (r.results ?? []).map((res) => ({
      modelId: res.modelId,
      modelName: res.modelName,
      overallScore: res.overallScore,
    })),
  }));

  return NextResponse.json({ reports: summaries });
}
