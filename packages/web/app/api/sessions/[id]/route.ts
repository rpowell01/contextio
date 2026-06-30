import fs from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import type { Session } from "@/types/api";

const CAPTURE_DIR = join(homedir(), ".contextio", "captures");
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILENAME_LENGTH = 255;

function isValidFilename(filename: string): boolean {
  if (!filename || filename.length === 0) return false;
  if (filename.length > MAX_FILENAME_LENGTH) return false;
  if (filename.startsWith(".")) return false;
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) return false;
  const validPattern = /^[a-zA-Z0-9_-]+\.json$/;
  return validPattern.test(filename);
}

async function listCaptureFiles(): Promise<string[]> {
  try {
    const files = await fs.readdir(CAPTURE_DIR);
    return files.filter((f) => isValidFilename(f) && !f.endsWith(".tmp")).sort();
  } catch {
    return [];
  }
}

function extractSessionId(filename: string): string | null {
  const match = filename.match(/_([a-f0-9]{8,16})_(?:\d{4}-\d{2}-\d{2}|[a-f0-9]{8,14})(?:[-_]?\d+)?\.json$/i);
  if (match) return match[1].toLowerCase();
  const fallbackMatch = filename.match(/_([a-f0-9]{8,16})\.(json|tmp)$/i);
  return fallbackMatch ? fallbackMatch[1].toLowerCase() : null;
}

function validateCaptureTimestamp(timestamp: unknown): string | null {
  if (typeof timestamp !== "string") return null;
  const date = new Date(timestamp);
  return isNaN(date.getTime()) ? null : timestamp;
}

async function getSessionMetadata(filename: string, data: Record<string, unknown>): Promise<Omit<Session, "requestBody" | "responseBody" | "timings"> & { requestBody: Record<string, unknown>; responseBody: string | null; timings: Session["timings"] }> {
  const sessionId = extractSessionId(filename);
  const responseStatus = typeof data.responseStatus === "number" ? data.responseStatus : Number(data.responseStatus) || 0;
  const responseIsStreaming = typeof data.responseIsStreaming === "boolean" ? data.responseIsStreaming : data.responseIsStreaming === true || data.responseIsStreaming === "true";

  const rawTimings = (data.timings && typeof data.timings === "object") ? data.timings as Record<string, unknown> : {};
  const timings = {
    total_ms: typeof rawTimings.total_ms === "number" ? rawTimings.total_ms : Number(rawTimings.total_ms) || 0,
  };

  const validatedTimestamp = validateCaptureTimestamp(data.timestamp);

  return {
    id: filename,
    sessionId: sessionId ?? "",
    source: typeof data.source === "string" ? data.source : "unknown",
    provider: typeof data.provider === "string" ? data.provider : "unknown",
    apiFormat: typeof data.apiFormat === "string" ? data.apiFormat : "unknown",
    targetUrl: typeof data.targetUrl === "string" ? data.targetUrl : "",
    requestBody: (typeof data.requestBody === "object" && data.requestBody !== null) ? data.requestBody as Record<string, unknown> : {},
    responseBody: typeof data.responseBody === "string" ? data.responseBody : null,
    responseStatus,
    responseIsStreaming,
    timestamp: validatedTimestamp ?? new Date().toISOString(),
    timings,
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const files = await listCaptureFiles();

    for (const filename of files) {
      try {
        const filepath = join(CAPTURE_DIR, filename);
        const stats = await fs.stat(filepath);
        if (stats.size > MAX_FILE_SIZE) continue;

        const raw = await fs.readFile(filepath, "utf8");
        const data = JSON.parse(raw) as Record<string, unknown>;

        const sessionId = extractSessionId(filename);
        if (sessionId !== id) continue;

        const session = await getSessionMetadata(filename, data);
        return Response.json(session);
      } catch {
        continue;
      }
    }

    return Response.json({ error: "Session not found" }, { status: 404 });
  } catch (error) {
    console.error("Error in session detail API:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}