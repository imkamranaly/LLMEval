// ─────────────────────────────────────────────────────────────
//  Server-side report persistence
//  Writes / reads HistoricalReport JSON files to:
//    {project_root}/data/reports/{id}.json
//
//  SERVER-ONLY — do not import from client components.
// ─────────────────────────────────────────────────────────────
import fs from "fs/promises";
import path from "path";
import type { HistoricalReport } from "@/types/evaluation";

const REPORTS_DIR = path.join(process.cwd(), "data", "reports");

/** Ensure the reports directory exists */
async function ensureDir() {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
}

/** Converts an ISO timestamp to a safe filename (no colons or dots) */
function toFilename(id: string): string {
  return `${id.replace(/[:.]/g, "-")}.json`;
}

/** Persist a HistoricalReport to disk. Idempotent — overwrites same id. */
export async function saveReport(report: HistoricalReport): Promise<void> {
  await ensureDir();
  await fs.writeFile(
    path.join(REPORTS_DIR, toFilename(report.id)),
    JSON.stringify(report, null, 2),
    "utf-8"
  );
}

/** Return all stored reports, newest first. */
export async function listReports(): Promise<HistoricalReport[]> {
  await ensureDir();
  try {
    const files = await fs.readdir(REPORTS_DIR);
    const reports: HistoricalReport[] = [];
    for (const file of files.filter((f) => f.endsWith(".json"))) {
      try {
        const raw = await fs.readFile(path.join(REPORTS_DIR, file), "utf-8");
        reports.push(JSON.parse(raw) as HistoricalReport);
      } catch {
        // Skip malformed files
      }
    }
    return reports.sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp)
    );
  } catch {
    return [];
  }
}

/** Return a single report by id, or null if not found. */
export async function getReport(id: string): Promise<HistoricalReport | null> {
  try {
    const raw = await fs.readFile(
      path.join(REPORTS_DIR, toFilename(id)),
      "utf-8"
    );
    return JSON.parse(raw) as HistoricalReport;
  } catch {
    return null;
  }
}

/** Delete a report by id. Returns true if deleted, false if not found. */
export async function deleteReport(id: string): Promise<boolean> {
  try {
    await fs.unlink(path.join(REPORTS_DIR, toFilename(id)));
    return true;
  } catch {
    return false;
  }
}
