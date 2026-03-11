// ─────────────────────────────────────────────────────────────
//  POST /api/evaluate
//  Runs the full evaluation protocol for selected models/criteria
//  Streams progress updates via Server-Sent Events
// ─────────────────────────────────────────────────────────────
import { NextRequest } from "next/server";
import { runEvaluation } from "@/lib/scoring";
import { generateRecommendations } from "@/lib/recommendations";
import { buildHeatmapMatrix } from "@/lib/scoring";
import { saveReport } from "@/lib/serverReportStore";
import type { EvaluationRequest, CriteriaId, HistoricalReport } from "@/types/evaluation";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes — long evaluations

export async function POST(request: NextRequest) {
  const body: EvaluationRequest = await request.json();

  if (!body.modelIds?.length || !body.criteriaIds?.length) {
    return new Response(
      JSON.stringify({ error: "modelIds and criteriaIds are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Use streaming SSE so the client gets real-time progress
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        send("status", { message: "Starting evaluation...", progress: 0 });

        const totalOps = body.modelIds.length * body.criteriaIds.length;
        let completed = 0;

        const results = await runEvaluation(
          body.modelIds,
          body.criteriaIds as CriteriaId[],
          (msg: string) => {
            // Progress update on each benchmark call
            send("progress", { message: msg, progress: Math.round((completed / totalOps) * 90) });
          }
        );

        completed = totalOps;
        send("status", { message: "Computing recommendations...", progress: 92 });

        const recommendations = generateRecommendations(results);
        const heatmap = buildHeatmapMatrix(results);

        // ── Persist report to disk (append-only) ──────────────
        const timestamp = new Date().toISOString();
        const report: HistoricalReport = {
          id: timestamp,
          timestamp,
          selectedModels: body.modelIds,
          selectedCriteria: body.criteriaIds,
          results,
          recommendations,
          heatmap,
          iterationsPerTest: 5,
          temperature: 0,
          totalCostUSD: results.reduce((s, r) => s + r.totalCostUSD, 0),
          averageLatencyMs: Math.round(
            results.reduce((s, r) => s + r.averageLatencyMs, 0) /
              Math.max(results.length, 1)
          ),
        };
        try {
          await saveReport(report);
        } catch (e) {
          console.error("[evaluate] Failed to save report to disk:", e);
        }

        send("status", { message: "Evaluation complete", progress: 100 });
        send("complete", { results, recommendations, heatmap, reportId: timestamp });
      } catch (error) {
        send("error", {
          message: error instanceof Error ? error.message : "Evaluation failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
