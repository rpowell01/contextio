import fs from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import type { Capture, CaptureWithRedaction, RedactionDetails, PaginationMeta } from "@/types/api";

const CAPTURE_DIR = join(homedir(), ".contextio", "captures");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit for capture files

/**
 * Extract capture metadata from parsed data.
 */
function extractCaptureMetadata(filename: string, data: Record<string, unknown>): Capture {
  // Extract session ID from filename
  const sessionId = extractSessionId(filename);

  // Extract and convert numeric fields
  const requestBytes = typeof data.requestBytes === "number" ? data.requestBytes : Number(data.requestBytes) || 0;
  const responseBytes = typeof data.responseBytes === "number" ? data.responseBytes : Number(data.responseBytes) || 0;
  const responseStatus = typeof data.responseStatus === "number" ? data.responseStatus : Number(data.responseStatus) || 0;

  // Extract and convert boolean field
  const responseIsStreaming = typeof data.responseIsStreaming === "boolean"
    ? data.responseIsStreaming
    : data.responseIsStreaming === true || data.responseIsStreaming === "true";

  // Extract and convert timings subfields
  const rawTimings = (data.timings && typeof data.timings === "object") ? data.timings as Record<string, unknown> : {};
  const timings = {
    send_ms: typeof rawTimings.send_ms === "number" ? rawTimings.send_ms : Number(rawTimings.send_ms) || 0,
    wait_ms: typeof rawTimings.wait_ms === "number" ? rawTimings.wait_ms : Number(rawTimings.wait_ms) || 0,
    receive_ms: typeof rawTimings.receive_ms === "number" ? rawTimings.receive_ms : Number(rawTimings.receive_ms) || 0,
    total_ms: typeof rawTimings.total_ms === "number" ? rawTimings.total_ms : Number(rawTimings.total_ms) || 0,
  };

  return {
    id: filename,
    sessionId,
    source: data.source ?? null,
    provider: data.provider ?? "unknown",
    apiFormat: data.apiFormat ?? "unknown",
    targetUrl: data.targetUrl ?? "",
    method: data.method ?? "POST",
    requestBytes,
    responseBytes,
    responseStatus,
    responseIsStreaming,
    timestamp: data.timestamp ?? new Date().toISOString(),
    timings,
  };
}

/**
 * Compute redaction details from a capture.
 */
function computeRedactionDetails(rawData: Record<string, unknown>): RedactionDetails {
  const matches: { ruleId: string; original: string; placeholder: string; path: string }[] = [];
  const byRule: Record<string, number> = {};

  try {
    const requestBody = rawData.requestBody;
    if (requestBody && typeof requestBody === "object") {
      const redacted = findRedactedValues(requestBody as Record<string, unknown>, "");
      matches.push(...redacted.matches);
      Object.assign(byRule, redacted.byRule);
    }

    const responseBody = rawData.responseBody;
    if (typeof responseBody === "string") {
      try {
        const parsed = JSON.parse(responseBody);
        const redacted = findRedactedValues(parsed as Record<string, unknown>, "");
        matches.push(...redacted.matches);
        Object.assign(byRule, redacted.byRule);
      } catch {
        const redacted = findRedactedValuesInString(responseBody);
        matches.push(...redacted.matches);
        Object.assign(byRule, redacted.byRule);
      }
    }
  } catch (error) {
    console.error("Error computing redaction details:", error);
  }

  return {
    totalRedactions: matches.length,
    byRule,
    matches,
  };
}

function findRedactedValues(
  obj: Record<string, unknown>,
  path: string,
): {
  matches: { ruleId: string; original: string; placeholder: string; path: string }[];
  byRule: Record<string, number>;
} {
  const matches: { ruleId: string; original: string; placeholder: string; path: string }[] = [];
  const byRule: Record<string, number> = {};

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;

    if (typeof value === "string") {
      const redacted = findRedactedValuesInString(value);
      for (const m of redacted.matches) {
        matches.push({ ...m, path: `${currentPath}` });
      }
      Object.assign(byRule, redacted.byRule);
    } else if (value && typeof value === "object") {
      if (Array.isArray(value)) {
        value.forEach((item, i) => {
          if (typeof item === "string") {
            const redacted = findRedactedValuesInString(item);
            for (const m of redacted.matches) {
              matches.push({ ...m, path: `${currentPath}[${i}]` });
            }
            Object.assign(byRule, redacted.byRule);
          } else if (item && typeof item === "object") {
            const nested = findRedactedValues(item as Record<string, unknown>, `${currentPath}[${i}]`);
            matches.push(...nested.matches);
            Object.assign(byRule, nested.byRule);
          }
        });
      } else {
        const nested = findRedactedValues(value as Record<string, unknown>, currentPath);
        matches.push(...nested.matches);
        Object.assign(byRule, nested.byRule);
      }
    }
  }

  return { matches, byRule };
}

function findRedactedValuesInString(text: string): {
  matches: { ruleId: string; original: string; placeholder: string; path: string }[];
  byRule: Record<string, number>;
} {
  const matches: { ruleId: string; original: string; placeholder: string; path: string }[] = [];
  const byRule: Record<string, number> = {};

  const placeholderRegex = /\[([A-Z][A-Z0-9_]*)_(\d+)\]/g;
  let m: RegExpExecArray | null;

  while ((m = placeholderRegex.exec(text)) !== null) {
    const placeholder = m[0];
    const ruleId = m[1].toLowerCase();

    matches.push({
      ruleId,
      original: `[REDACTED_${ruleId.toUpperCase()}_${m[2]}]`,
      placeholder,
      path: "",
    });

    byRule[ruleId] = (byRule[ruleId] || 0) + 1;
  }

  return { matches, byRule };
}

async function listCaptureFiles(): Promise<string[]> {
  try {
    const files = await fs.readdir(CAPTURE_DIR);
    return files
      .filter((f) => isValidFilename(f) && !f.endsWith(".tmp"))
      .sort();
  } catch (error) {
    console.error("Error listing capture files:", error);
    return [];
  }
}

/**
 * Validate date string and return Date object or null if invalid.
 */
function validateDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Safely extract session ID from filename.
 * Format: {source}_{sessionId}_{timestamp}-{counter}.json
 * Session ID is expected to be 8 hex characters.
 */
function extractSessionId(filename: string): string | null {
  const match = filename.match(/_([a-f0-9]{8})_/);
  return match ? match[1] : null;
}

/**
 * Validate filename to prevent path traversal attacks.
 */
function isValidFilename(filename: string): boolean {
  // Only allow alphanumeric, underscore, hyphen, and .json extension
  const validPattern = /^[a-zA-Z0-9_-]+\.json$/;
  if (!validPattern.test(filename)) return false;
  // Prevent path traversal attempts
  if (filename.includes("..") || filename.startsWith("/") || filename.startsWith("\\")) {
    return false;
  }
  return true;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    const source = url.searchParams.get("source");
    const status = url.searchParams.get("status");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const redactionType = url.searchParams.get("redactionType");
    const includeRedaction = url.searchParams.get("includeRedaction") === "true";

    // Pagination parameters
    const page = parseInt(url.searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);

    // Validate pagination parameters
    const validPage = page > 0 ? page : 1;
    const validPageSize = pageSize > 0 && pageSize <= 100 ? pageSize : 20;

    // Validate date parameters
    const fromDate = validateDate(from);
    const toDate = validateDate(to);

    if (from && !fromDate) {
      return Response.json(
        { error: "Invalid 'from' date parameter" },
        { status: 400 },
      );
    }
    if (to && !toDate) {
      return Response.json(
        { error: "Invalid 'to' date parameter" },
        { status: 400 },
      );
    }

    const files = await listCaptureFiles();
    const captures: (Capture | CaptureWithRedaction)[] = [];

    for (const filename of files) {
      const filepath = join(CAPTURE_DIR, filename);
      let capture: Capture | null = null;
      let redaction: RedactionDetails | null = null;

      try {
        // Check file size before reading
        const stats = await fs.stat(filepath);
        if (stats.size > MAX_FILE_SIZE) {
          console.warn(`Capture file too large, skipping: ${filename}`);
          continue;
        }

        const raw = await fs.readFile(filepath, "utf8");
        const data = JSON.parse(raw) as Record<string, unknown>;

        // Extract capture metadata
        capture = extractCaptureMetadata(filename, data);

        // Compute redaction details if needed (includeRedaction or redactionType filtering)
        if (includeRedaction || (redactionType && redactionType !== "all")) {
          redaction = computeRedactionDetails(data);

          // Filter by redaction type if specified
          if (redactionType && redactionType !== "all" && !redaction.byRule[redactionType]) {
            continue;
          }
        }

        // Apply date filters - skip records with invalid timestamps
        const captureDate = new Date(capture.timestamp);
        if (isNaN(captureDate.getTime())) continue;
        if (fromDate && captureDate < fromDate) continue;
        if (toDate && captureDate > toDate) continue;

        // Apply other filters
        if (sessionId && capture.sessionId !== sessionId) continue;
        if (source && capture.source !== source) continue;
        if (status && String(capture.responseStatus) !== status) continue;

        // Build result based on includeRedaction flag
        if (includeRedaction && redaction) {
          captures.push({ ...capture, redaction });
        } else {
          captures.push(capture);
        }
      } catch (error) {
        console.error(`Error processing capture ${filename}:`, error);
        continue;
      }
    }

    // Filter captures for pagination
    const filtered = captures;

    // Build pagination metadata
    const pagination: PaginationMeta = {
      page: validPage,
      pageSize: validPageSize,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / validPageSize),
    };

    // Apply pagination
    const startIndex = (validPage - 1) * validPageSize;
    const paginatedCaptures = filtered.slice(startIndex, startIndex + validPageSize);

    // Always return consistent response format
    return Response.json({
      data: paginatedCaptures,
      total: filtered.length,
      pagination,
    });
  } catch (error) {
    console.error("Error in captures API:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
