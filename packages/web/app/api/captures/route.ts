import fs from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import type {
  Capture,
  CaptureWithRedaction,
  RedactionDetails,
  PaginationMeta,
} from "@/types/api";

// Pre-compiled regex for placeholder pattern matching.
// Matches patterns like [EMAIL_1], [AWS_KEY_2], [SSN_REDACTED_3], etc.
// Format: [UPPERCASE_WITH_UNDERSCORES_NUMBER]
const PLACEHOLDER_REGEX = /\[([A-Z][A-Z0-9_]*)_(\d+)\]/g;

/**
 * Increment a counter in the byRule record.
 * Helper to avoid repetitive Object.assign calls.
 */
function incrementRuleCount(
  byRule: Record<string, number>,
  ruleId: string,
): void {
  byRule[ruleId] = (byRule[ruleId] ?? 0) + 1;
}

const CAPTURE_DIR = join(homedir(), ".contextio", "captures");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit for capture files

/**
 * Extract capture metadata from parsed data.
 */
function extractCaptureMetadata(
  filename: string,
  data: Record<string, unknown>,
): Capture {
  // Extract session ID from filename
  const sessionId = extractSessionId(filename);

  // Extract and convert numeric fields
  const requestBytes =
    typeof data.requestBytes === "number"
      ? data.requestBytes
      : Number(data.requestBytes) || 0;
  const responseBytes =
    typeof data.responseBytes === "number"
      ? data.responseBytes
      : Number(data.responseBytes) || 0;
  const responseStatus =
    typeof data.responseStatus === "number"
      ? data.responseStatus
      : Number(data.responseStatus) || 0;

  // Extract and convert boolean field
  const responseIsStreaming =
    typeof data.responseIsStreaming === "boolean"
      ? data.responseIsStreaming
      : data.responseIsStreaming === true ||
        data.responseIsStreaming === "true";

  // Extract and convert timings subfields
  const rawTimings =
    data.timings && typeof data.timings === "object"
      ? (data.timings as Record<string, unknown>)
      : {};
  const timings = {
    send_ms:
      typeof rawTimings.send_ms === "number"
        ? rawTimings.send_ms
        : Number(rawTimings.send_ms) || 0,
    wait_ms:
      typeof rawTimings.wait_ms === "number"
        ? rawTimings.wait_ms
        : Number(rawTimings.wait_ms) || 0,
    receive_ms:
      typeof rawTimings.receive_ms === "number"
        ? rawTimings.receive_ms
        : Number(rawTimings.receive_ms) || 0,
    total_ms:
      typeof rawTimings.total_ms === "number"
        ? rawTimings.total_ms
        : Number(rawTimings.total_ms) || 0,
  };

  // Validate timestamp before using it
  const validatedTimestamp = validateCaptureTimestamp(data.timestamp);

  // Extract source from data or filename
  const extractedSource =
    typeof data.source === "string" ? data.source : extractSource(filename);

  return {
    id: filename,
    sessionId,
    source: extractedSource,
    provider: typeof data.provider === "string" ? data.provider : "unknown",
    apiFormat: typeof data.apiFormat === "string" ? data.apiFormat : "unknown",
    targetUrl: typeof data.targetUrl === "string" ? data.targetUrl : "",
    method: typeof data.method === "string" ? data.method : "POST",
    requestBytes,
    responseBytes,
    responseStatus,
    responseIsStreaming,
    timestamp: validatedTimestamp ?? new Date().toISOString(),
    timings,
  };
}

/**
 * Compute redaction details from a capture.
 */
function computeRedactionDetails(
  rawData: Record<string, unknown>,
): RedactionDetails {
  const matches: {
    ruleId: string;
    original: string;
    placeholder: string;
    path: string;
  }[] = [];
  const byRule: Record<string, number> = {};

  try {
    const requestBody = rawData.requestBody;
    if (requestBody && typeof requestBody === "object") {
      findRedactedValues(
        requestBody as Record<string, unknown>,
        "",
        matches,
        byRule,
      );
    }

    const responseBody = rawData.responseBody;
    if (typeof responseBody === "string") {
      try {
        const parsed = JSON.parse(responseBody);
        if (parsed && typeof parsed === "object") {
          findRedactedValues(
            parsed as Record<string, unknown>,
            "",
            matches,
            byRule,
          );
        }
      } catch {
        findRedactedValuesInString(responseBody, matches, byRule);
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

/**
 * Recursively walk a JSON object tree and find all redacted placeholders.
 *
 * Mutates the provided matches and byRule objects for efficiency.
 * Handles nested objects, arrays, and primitive values.
 *
 * @param obj - The object to traverse
 * @param currentPath - Current JSON path (empty string for root)
 * @param matches - Array to collect match details (mutated in place)
 * @param byRule - Record to collect per-rule counts (mutated in place)
 */
function findRedactedValues(
  obj: Record<string, unknown>,
  currentPath: string,
  matches: {
    ruleId: string;
    original: string;
    placeholder: string;
    path: string;
  }[],
  byRule: Record<string, number>,
): void {
  for (const [key, value] of Object.entries(obj)) {
    const path = currentPath ? `${currentPath}.${key}` : key;

    if (typeof value === "string") {
      findRedactedValuesInString(value, matches, byRule, path);
    } else if (value !== null && typeof value === "object") {
      if (Array.isArray(value)) {
        value.forEach((item, i) => {
          const itemPath = `${path}[${i}]`;
          if (typeof item === "string") {
            findRedactedValuesInString(item, matches, byRule, itemPath);
          } else if (item !== null && typeof item === "object") {
            findRedactedValues(
              item as Record<string, unknown>,
              itemPath,
              matches,
              byRule,
            );
          }
        });
      } else {
        findRedactedValues(
          value as Record<string, unknown>,
          path,
          matches,
          byRule,
        );
      }
    }
    // null and undefined values are skipped
  }
}

/**
 * Find all redacted placeholders in a string.
 *
 * Uses a pre-compiled regex for efficiency. Mutates the provided matches
 * and byRule objects for collecting results.
 *
 * @param text - The string to search for placeholders
 * @param matches - Array to collect match details (mutated in place)
 * @param byRule - Record to collect per-rule counts (mutated in place)
 * @param path - JSON path where this string was found (used for context)
 */
function findRedactedValuesInString(
  text: string,
  matches: {
    ruleId: string;
    original: string;
    placeholder: string;
    path: string;
  }[],
  byRule: Record<string, number>,
  path: string = "",
): void {
  // Reset regex lastIndex for global regex reuse
  PLACEHOLDER_REGEX.lastIndex = 0;

  let m: RegExpExecArray | null;

  while ((m = PLACEHOLDER_REGEX.exec(text)) !== null) {
    const placeholder = m[0];
    const ruleId = m[1].toLowerCase();

    matches.push({
      ruleId,
      original: `[REDACTED_${ruleId.toUpperCase()}_${m[2]}]`,
      placeholder,
      path,
    });

    incrementRuleCount(byRule, ruleId);
  }
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
 * Validate capture timestamp and return ISO string or null if invalid.
 */
function validateCaptureTimestamp(timestamp: unknown): string | null {
  if (typeof timestamp !== "string") return null;
  const date = new Date(timestamp);
  return isNaN(date.getTime()) ? null : timestamp;
}

const MAX_FILENAME_LENGTH = 255;

/**
 * Safely extract session ID from filename.
 * Supports filename format: {source}_{sessionId}_{timestamp}-{counter}.json
 * where timestamp is 13-digit Unix epoch milliseconds.
 * Session ID is expected to be 8 lowercase hex chars.
 *
 * @param filename - The capture filename to parse
 * @returns The extracted session ID or null if not found
 */
function extractSessionId(filename: string): string | null {
  // Match: source_{sessionId}_{13digitTimestamp}-{counter}.json
  // Session ID is 8 lowercase hex chars between underscores
  const match = filename.match(/_([a-f0-9]{8})_\d{13}-\d{6}\.json$/i);
  if (match) return match[1].toLowerCase();

  // Fallback: try to find any hex string that looks like a session ID
  const fallbackMatch = filename.match(/_([a-f0-9]{8,16})\.(json|tmp)$/i);
  return fallbackMatch ? fallbackMatch[1].toLowerCase() : null;
}

/**
 * Safely extract source from filename.
 * Supports filename format: {source}_{sessionId}_{timestamp}-{counter}.json
 * where source is alphanumeric with hyphens/underscores.
 *
 * @param filename - The capture filename to parse
 * @returns The extracted source or null if not found
 */
function extractSource(filename: string): string | null {
  // Match: {source}_{sessionId}_{timestamp}-{counter}.json
  // Source is everything before the last two underscore-separated segments
  // Session ID is 8 lowercase hex chars, timestamp is 13 digits
  const match = filename.match(
    /^([a-zA-Z0-9_-]+)_[a-f0-9]{8}_\d{13}-\d{6}\.json$/i,
  );
  if (match) return match[1];

  return null;
}

/**
 * Validate filename to prevent path traversal attacks and ensure safe file access.
 *
 * @param filename - The filename to validate
 * @returns true if the filename is valid and safe, false otherwise
 */
function isValidFilename(filename: string): boolean {
  // Check for empty filename
  if (!filename || filename.length === 0) {
    return false;
  }

  // Check maximum length to prevent filesystem issues
  if (filename.length > MAX_FILENAME_LENGTH) {
    return false;
  }

  // Check for hidden files (starting with .)
  if (filename.startsWith(".")) {
    return false;
  }

  // Check for path traversal patterns
  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return false;
  }

  // Only allow alphanumeric, underscore, hyphen, and .json extension
  // Must have at least one character before .json
  const validPattern = /^[a-zA-Z0-9_-]+\.json$/;
  if (!validPattern.test(filename)) {
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
    const includeRedaction =
      url.searchParams.get("includeRedaction") === "true";

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
          if (
            redactionType &&
            redactionType !== "all" &&
            !redaction.byRule[redactionType]
          ) {
            continue;
          }
        }

        // Apply date filters - skip records with invalid timestamps
        const captureTimestamp = validateCaptureTimestamp(capture.timestamp);
        if (!captureTimestamp) continue;
        const captureDate = new Date(captureTimestamp);
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
    const paginatedCaptures = filtered.slice(
      startIndex,
      startIndex + validPageSize,
    );

    // Always return consistent response format
    return Response.json({
      data: paginatedCaptures,
      total: filtered.length,
      pagination,
    });
  } catch (error) {
    console.error("Error in captures API:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
