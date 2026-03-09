// ─────────────────────────────────────────────────────────────
//  POST /api/save-report
//  Persists a HistoricalReport to data/reports/{id}.json
//  Used by client when server-side saving in /api/evaluate fails.
// ─────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { saveReport } from "@/lib/serverReportStore";
import type { HistoricalReport } from "@/types/evaluation";

export async function POST(request: NextRequest) {
  try {
    const report: HistoricalReport = await request.json();
    if (!report?.id || !report?.results) {
      return NextResponse.json({ error: "Invalid report payload" }, { status: 400 });
    }
    await saveReport(report);
    return NextResponse.json({ success: true, id: report.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 500 }
    );
  }
}
