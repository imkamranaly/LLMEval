// ─────────────────────────────────────────────────────────────
//  POST /api/generate-report
//  Generates and streams a PDF evaluation report
// ─────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import type {
  ModelEvaluationResult,
  RecommendationReport,
} from "@/types/evaluation";
import { MERGED_CRITERIA_MAP, IMAGE_CRITERIA_ROWS } from "@/data/imageCriteria";

interface ReportRequest {
  results: ModelEvaluationResult[];
  recommendations: RecommendationReport;
  title?: string;
}

// ── WinAnsi-safe string sanitizer ────────────────────────────
// pdf-lib standard fonts only support WinAnsi (Latin-1 + extras).
// Replace common special chars with ASCII equivalents; strip the rest.
function safe(text: string): string {
  return text
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/→/g, "->")
    .replace(/←/g, "<-")
    .replace(/±/g, "+/-")
    .replace(/×/g, "x")
    .replace(/÷/g, "/")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/∫/g, "integral")
    .replace(/∑/g, "sum")
    .replace(/√/g, "sqrt")
    .replace(/π/g, "pi")
    .replace(/°/g, " deg")
    .replace(/\u2019/g, "'")   // right single quote
    .replace(/\u2018/g, "'")   // left single quote
    .replace(/\u201C/g, '"')   // left double quote
    .replace(/\u201D/g, '"')   // right double quote
    .replace(/\u2013/g, "-")   // en dash
    .replace(/\u2014/g, "--")  // em dash
    .replace(/[^\x00-\xFF]/g, "?"); // fallback: replace any remaining non-Latin1
}

// ── Colour helpers ────────────────────────────────────────────

function scoreToColor(score: number) {
  if (score >= 75) return rgb(0.18, 0.73, 0.39);  // green
  if (score >= 50) return rgb(0.97, 0.76, 0.1);   // yellow
  return rgb(0.93, 0.27, 0.27);                    // red
}

// ── Layout helpers ────────────────────────────────────────────

function addPage(doc: PDFDocument): PDFPage {
  return doc.addPage([842, 595]); // A4 landscape
}

function header(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size = 18,
  color = rgb(0.1, 0.1, 0.3)
) {
  page.drawText(safe(text), { x: 40, y, font, size, color });
}

function rule(page: PDFPage, y: number) {
  page.drawLine({
    start: { x: 40, y },
    end: { x: 802, y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
}

// ── PDF builder ───────────────────────────────────────────────

async function buildPDF(req: ReportRequest): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await doc.embedFont(StandardFonts.Helvetica);

  // ── Cover page ───────────────────────────────────────────────
  {
    const page = addPage(doc);
    const { width, height } = page.getSize();

    // Background banner
    page.drawRectangle({
      x: 0, y: height - 120,
      width, height: 120,
      color: rgb(0.08, 0.12, 0.28),
    });

    page.drawText(safe(req.title ?? "LLM Benchmark Evaluation Report"), {
      x: 40, y: height - 70,
      font: fontBold, size: 28,
      color: rgb(1, 1, 1),
    });

    page.drawText(safe(`Generated: ${new Date().toUTCString()}`), {
      x: 40, y: height - 100,
      font: fontReg, size: 11,
      color: rgb(0.8, 0.85, 1),
    });

    // Models evaluated
    page.drawText("Models Evaluated", { x: 40, y: height - 150, font: fontBold, size: 14, color: rgb(0.1, 0.1, 0.3) });
    rule(page, height - 158);

    let yCursor = height - 180;
    for (const result of req.results) {
      page.drawText(safe(`* ${result.modelName}  (${result.provider})  - Overall: ${result.overallScore}/100`), {
        x: 50, y: yCursor, font: fontReg, size: 11, color: rgb(0.2, 0.2, 0.2),
      });
      yCursor -= 18;
    }

    // Summary stats box
    const boxY = 60;
    page.drawRectangle({ x: 40, y: boxY, width: 760, height: 80, color: rgb(0.95, 0.97, 1) });
    page.drawText("Quick Stats", { x: 50, y: boxY + 58, font: fontBold, size: 12, color: rgb(0.2, 0.2, 0.6) });

    const best = [...req.results].sort((a, b) => b.overallScore - a.overallScore)[0];
    const cheapest = [...req.results].sort((a, b) => a.totalCostUSD - b.totalCostUSD)[0];
    const fastest = [...req.results].sort((a, b) => a.averageLatencyMs - b.averageLatencyMs)[0];

    page.drawText(safe(`Best Overall: ${best?.modelName} (${best?.overallScore}/100)   |   Cheapest: ${cheapest?.modelName} ($${cheapest?.totalCostUSD.toFixed(4)})   |   Fastest: ${fastest?.modelName} (${fastest?.averageLatencyMs}ms)`), {
      x: 50, y: boxY + 30, font: fontReg, size: 10, color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(`Models: ${req.results.length}   |   Criteria tested: ${req.results[0]?.criteriaResults.length ?? 0}   |   Runs per test: 5   |   Temperature: 0`, {
      x: 50, y: boxY + 12, font: fontReg, size: 10, color: rgb(0.3, 0.3, 0.3),
    });
  }

  // ── Scores table page ─────────────────────────────────────────
  {
    const page = addPage(doc);
    const { height } = page.getSize();

    header(page, "Evaluation Scores by Criteria", height - 50, fontBold, 18);
    rule(page, height - 60);

    const COL_WIDTH = 70;
    const ROW_HEIGHT = 22;
    const COL_START = 190;

    // All unique criteria
    const criteriaIds = req.results[0]?.criteriaResults.map((c) => c.criteriaId) ?? [];

    // Column headers
    let xHead = COL_START;
    for (const cid of criteriaIds) {
      const label = safe((MERGED_CRITERIA_MAP[cid]?.name ?? cid).split(" ").slice(0, 2).join(" "));
      page.drawText(label, {
        x: xHead, y: height - 85,
        font: fontBold, size: 8, color: rgb(0.3, 0.3, 0.5),
      });
      xHead += COL_WIDTH;
    }
    // Overall header
    page.drawText("Overall", { x: xHead, y: height - 85, font: fontBold, size: 8, color: rgb(0.1, 0.1, 0.3) });

    rule(page, height - 92);

    // Data rows
    let yRow = height - 110;
    for (const result of req.results) {
      // Model name
      page.drawText(safe(result.modelName), {
        x: 40, y: yRow, font: fontBold, size: 9, color: rgb(0.1, 0.1, 0.2),
      });

      let xCell = COL_START;
      for (const cid of criteriaIds) {
        const cr = result.criteriaResults.find((c) => c.criteriaId === cid);
        const score = cr?.normalizedScore ?? 0;

        page.drawRectangle({
          x: xCell + 1, y: yRow - 4,
          width: COL_WIDTH - 4, height: ROW_HEIGHT - 4,
          color: scoreToColor(score),
          opacity: 0.85,
        });
        page.drawText(String(score), {
          x: xCell + (score >= 100 ? 24 : score >= 10 ? 28 : 32),
          y: yRow + 2,
          font: fontBold, size: 9, color: rgb(1, 1, 1),
        });
        xCell += COL_WIDTH;
      }

      // Overall score
      page.drawRectangle({
        x: xCell + 1, y: yRow - 4,
        width: COL_WIDTH - 4, height: ROW_HEIGHT - 4,
        color: scoreToColor(result.overallScore),
      });
      page.drawText(String(result.overallScore), {
        x: xCell + 28, y: yRow + 2,
        font: fontBold, size: 9, color: rgb(1, 1, 1),
      });

      yRow -= ROW_HEIGHT + 2;
    }
  }

  // ── Cost analysis page ────────────────────────────────────────
  {
    const page = addPage(doc);
    const { height } = page.getSize();

    header(page, "Cost & Latency Analysis", height - 50, fontBold, 18);
    rule(page, height - 60);

    const headers = ["Model", "Provider", "Total Cost (USD)", "Avg Latency (ms)", "Overall Score", "Cost/Score Ratio"];
    const colWidths = [180, 100, 130, 140, 120, 130];
    let xPos = 40;

    // Draw header row
    for (let i = 0; i < headers.length; i++) {
      page.drawText(headers[i], {
        x: xPos, y: height - 85,
        font: fontBold, size: 10, color: rgb(0.2, 0.2, 0.5),
      });
      xPos += colWidths[i];
    }
    rule(page, height - 92);

    let yRow = height - 110;
    const sortedByCost = [...req.results].sort((a, b) => a.totalCostUSD - b.totalCostUSD);

    for (const r of sortedByCost) {
      const ratio = r.overallScore > 0 ? (r.totalCostUSD / r.overallScore * 1000).toFixed(4) : "N/A";
      const cols = [
        r.modelName,
        r.provider,
        `$${r.totalCostUSD.toFixed(6)}`,
        `${r.averageLatencyMs} ms`,
        `${r.overallScore}/100`,
        `$${ratio}/pt`,
      ];

      xPos = 40;
      for (let i = 0; i < cols.length; i++) {
        page.drawText(safe(cols[i]), {
          x: xPos, y: yRow,
          font: fontReg, size: 10, color: rgb(0.15, 0.15, 0.15),
        });
        xPos += colWidths[i];
      }

      rule(page, yRow - 6);
      yRow -= 28;
    }
  }

  // ── Iteration details page ────────────────────────────────────
  {
    const page = addPage(doc);
    const { height } = page.getSize();

    header(page, "Per-Iteration Scores (5 Runs - Temperature = 0)", height - 50, fontBold, 18);
    rule(page, height - 60);

    const COL_W = 48;
    const ROW_H = 18;
    let ySection = height - 85;

    for (const result of req.results) {
      if (ySection < 60) break; // safety: don't overflow
      page.drawText(safe(result.modelName), {
        x: 40, y: ySection, font: fontBold, size: 11, color: rgb(0.08, 0.12, 0.28),
      });
      ySection -= 4;
      rule(page, ySection);
      ySection -= 16;

      // Header row
      page.drawText("Criteria", { x: 40, y: ySection, font: fontBold, size: 8, color: rgb(0.3, 0.3, 0.5) });
      for (let r = 0; r < 5; r++) {
        page.drawText(`Run ${r + 1}`, {
          x: 190 + r * COL_W, y: ySection,
          font: fontBold, size: 8, color: rgb(0.3, 0.3, 0.5),
        });
      }
      page.drawText("Avg", { x: 190 + 5 * COL_W, y: ySection, font: fontBold, size: 8, color: rgb(0.1, 0.1, 0.3) });
      page.drawText("+/-SD",  { x: 190 + 6 * COL_W, y: ySection, font: fontBold, size: 8, color: rgb(0.1, 0.1, 0.3) });
      ySection -= ROW_H;

      for (const cr of result.criteriaResults) {
        if (ySection < 50) break;
        const cname = safe((MERGED_CRITERIA_MAP[cr.criteriaId]?.name ?? cr.criteriaId)
          .split(" ").slice(0, 3).join(" "));
        page.drawText(cname, { x: 42, y: ySection, font: fontReg, size: 8, color: rgb(0.2, 0.2, 0.2) });

        for (let r = 0; r < 5; r++) {
          const run = cr.runs.find((run) => run.runIndex === r);
          const score = run?.score ?? 0;
          const hasRun = cr.runs.some((run) => run.runIndex === r);
          if (hasRun) {
            page.drawRectangle({
              x: 188 + r * COL_W, y: ySection - 3,
              width: COL_W - 4, height: ROW_H - 4,
              color: scoreToColor(score), opacity: 0.8,
            });
            page.drawText(String(score), {
              x: 188 + r * COL_W + (score >= 100 ? 8 : score >= 10 ? 12 : 16),
              y: ySection + 1,
              font: fontBold, size: 8, color: rgb(1, 1, 1),
            });
          }
        }
        // Avg
        page.drawText(String(cr.averageScore), {
          x: 190 + 5 * COL_W + 4, y: ySection + 1,
          font: fontBold, size: 9, color: rgb(0.1, 0.2, 0.6),
        });
        // StdDev
        page.drawText(`+/-${cr.stdDev}`, {
          x: 190 + 6 * COL_W + 2, y: ySection + 1,
          font: fontReg, size: 8, color: rgb(0.4, 0.4, 0.4),
        });
        ySection -= ROW_H;
      }
      ySection -= 10;
    }
  }

  // ── Test case breakdown pages ─────────────────────────────────
  {
    const criteriaIds = req.results[0]?.criteriaResults
      .filter((cr) => cr.caseResults && cr.caseResults.length > 0)
      .map((cr) => cr.criteriaId) ?? [];

    if (criteriaIds.length > 0) {
      const page = addPage(doc);
      const { height } = page.getSize();

      header(page, "Test Case Breakdown — 5 Cases per Criteria", height - 50, fontBold, 18);
      rule(page, height - 60);

      // Sub-header note
      page.drawText("Scores are averaged across all 5 runs (temperature = 0). Green >= 75 | Yellow >= 50 | Red < 50", {
        x: 40, y: height - 76, font: fontReg, size: 9, color: rgb(0.4, 0.4, 0.4),
      });

      const ROW_H = 20;
      const MODEL_COL_W = 62;
      const CASE_COL_START = 310;
      let ySection = height - 100;

      for (const criteriaId of criteriaIds) {
        const sampleCr = req.results[0].criteriaResults.find((c) => c.criteriaId === criteriaId);
        if (!sampleCr || !sampleCr.caseResults?.length) continue;

        // Need a new page if space is insufficient
        if (ySection < 80) break;

        const criteriaName = (MERGED_CRITERIA_MAP[criteriaId]?.name ?? criteriaId);

        // Criteria section title
        page.drawRectangle({ x: 38, y: ySection - 4, width: 766, height: 18, color: rgb(0.08, 0.12, 0.28) });
        page.drawText(safe(criteriaName), {
          x: 42, y: ySection + 2, font: fontBold, size: 10, color: rgb(1, 1, 1),
        });
        ySection -= ROW_H + 2;

        // Column headers: Case label | model1 | model2 | ...
        page.drawText("Case", { x: 42, y: ySection, font: fontBold, size: 8, color: rgb(0.3, 0.3, 0.5) });
        page.drawText("Expected / Rubric", { x: CASE_COL_START - 150, y: ySection, font: fontBold, size: 8, color: rgb(0.3, 0.3, 0.5) });
        req.results.forEach((r, i) => {
          const shortName = safe(r.modelName.split(" ").slice(0, 2).join(" "));
          page.drawText(shortName, {
            x: CASE_COL_START + i * MODEL_COL_W,
            y: ySection,
            font: fontBold, size: 7, color: rgb(0.2, 0.2, 0.5),
          });
        });
        ySection -= ROW_H - 4;
        page.drawLine({ start: { x: 40, y: ySection + 4 }, end: { x: 802, y: ySection + 4 }, thickness: 0.3, color: rgb(0.8, 0.8, 0.8) });

        // Case rows
        for (let i = 0; i < sampleCr.caseResults.length; i++) {
          if (ySection < 50) break;
          const c = sampleCr.caseResults[i];

          // Alternating row background
          if (i % 2 === 0) {
            page.drawRectangle({ x: 38, y: ySection - 4, width: 766, height: ROW_H - 2, color: rgb(0.97, 0.98, 1) });
          }

          // Case number + label
          page.drawText(safe(`${i + 1}. ${c.label}`), {
            x: 42, y: ySection + 2, font: fontBold, size: 8, color: rgb(0.1, 0.1, 0.2),
          });

          // Expected answer / rubric (truncated)
          const hint = safe(c.expectedAnswer
            ? `> ${c.expectedAnswer}`.slice(0, 38)
            : c.rubric ? c.rubric.slice(0, 38) + (c.rubric.length > 38 ? "..." : "") : "");
          page.drawText(hint, {
            x: CASE_COL_START - 150, y: ySection + 2, font: fontReg, size: 7, color: rgb(0.4, 0.4, 0.4),
          });

          // Score cells per model
          req.results.forEach((r, mi) => {
            const modelCr = r.criteriaResults.find((x) => x.criteriaId === criteriaId);
            const modelCase = modelCr?.caseResults.find((x) => x.promptId === c.promptId);
            const score = modelCase?.averageScore ?? 0;
            const cellX = CASE_COL_START + mi * MODEL_COL_W;

            page.drawRectangle({
              x: cellX, y: ySection - 3,
              width: MODEL_COL_W - 4, height: ROW_H - 5,
              color: scoreToColor(score), opacity: 0.85,
            });
            page.drawText(String(score), {
              x: cellX + (score >= 100 ? 16 : score >= 10 ? 20 : 24),
              y: ySection + 1,
              font: fontBold, size: 8, color: rgb(1, 1, 1),
            });
          });

          ySection -= ROW_H;
        }

        ySection -= 12;
      }
    }
  }

  // ── Image criteria reference page ─────────────────────────────
  {
    const page = addPage(doc);
    const { height } = page.getSize();

    header(page, "Evaluation Criteria Reference (10-Item Standard)", height - 50, fontBold, 18);
    rule(page, height - 60);

    // Table header
    const colX = [40, 220, 430];
    const colLabels = ["Evaluation Item", "What It Tests", "Benchmark / Method"];
    for (let i = 0; i < colLabels.length; i++) {
      page.drawText(colLabels[i], {
        x: colX[i], y: height - 82,
        font: fontBold, size: 10, color: rgb(0.2, 0.2, 0.5),
      });
    }
    rule(page, height - 88);

    let yRow = height - 105;
    IMAGE_CRITERIA_ROWS.forEach((row, idx) => {
      if (idx % 2 === 0) {
        page.drawRectangle({
          x: 38, y: yRow - 6, width: 766, height: 22,
          color: rgb(0.96, 0.97, 1),
        });
      }
      page.drawText(safe(`${idx + 1}. ${row.evaluationItem}`), {
        x: colX[0], y: yRow + 2, font: fontBold, size: 9, color: rgb(0.1, 0.1, 0.2),
      });
      page.drawText(safe(row.whatItTests), {
        x: colX[1], y: yRow + 2, font: fontReg, size: 9, color: rgb(0.2, 0.2, 0.2),
      });
      page.drawText(safe(row.benchmarkMethod), {
        x: colX[2], y: yRow + 2, font: fontReg, size: 9, color: rgb(0.3, 0.3, 0.4),
      });
      yRow -= 26;
    });
  }

  // ── Recommendations page ──────────────────────────────────────
  {
    const page = addPage(doc);
    const { height } = page.getSize();

    header(page, "Recommendations", height - 50, fontBold, 18);
    rule(page, height - 60);

    const recs = [
      req.recommendations.bestForCoding,
      req.recommendations.bestForMath,
      req.recommendations.bestForAgentTasks,
      req.recommendations.bestCostEfficient,
      req.recommendations.bestLongContext,
    ];

    let yRec = height - 100;
    for (const rec of recs) {
      page.drawRectangle({
        x: 40, y: yRec - 10, width: 760, height: 58,
        color: rgb(0.97, 0.98, 1),
      });
      page.drawText(safe(rec.category), {
        x: 50, y: yRec + 30, font: fontBold, size: 13, color: rgb(0.1, 0.2, 0.6),
      });
      page.drawText(safe(`Winner: ${rec.modelName}  (score: ${rec.score}/100)`), {
        x: 50, y: yRec + 12, font: fontBold, size: 10, color: rgb(0.2, 0.2, 0.2),
      });
      page.drawText(safe(rec.reason), {
        x: 50, y: yRec - 4, font: fontReg, size: 9, color: rgb(0.4, 0.4, 0.4),
      });
      yRec -= 80;
    }
  }

  return doc.save();
}

// ── Route handler ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: ReportRequest = await request.json();

    if (!body.results?.length) {
      return NextResponse.json({ error: "No evaluation results provided" }, { status: 400 });
    }

    const pdfBytes = await buildPDF(body);

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="llm-evaluation-report.pdf"',
        "Content-Length": String(pdfBytes.length),
      },
    });
  } catch (error) {
    console.error("[generate-report] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PDF generation failed" },
      { status: 500 }
    );
  }
}
