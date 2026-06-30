import fs from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import type { Session } from "@/types/api";

// Re-export Session type for convenience
export type { Session } from "@/types/api";

export const CAPTURE_DIR = join(homedir(), ".contextio", "captures");
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_FILENAME_LENGTH = 255;

/**
 * Validate filename to prevent path traversal attacks and ensure safe file access.
 */
export function isValidFilename(filename: string): boolean {
  if (!filename || filename.length === 0) return false;
  if (filename.length > MAX_FILENAME_LENGTH) return false;
  if (filename.startsWith(".")) return false;
  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  )
    return false;
  const validPattern = /^[a-zA-Z0-9_-]+\.json$/;
  return validPattern.test(filename);
}

/**
 * List capture files from the capture directory.
 */
export async function listCaptureFiles(): Promise<string[]> {
  try {
    const files = await fs.readdir(CAPTURE_DIR);
    return files
      .filter((f) => isValidFilename(f) && !f.endsWith(".tmp"))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Safely extract session ID from filename.
 * Supports filename format: {source}_{sessionId}_{timestamp}-{counter}.json
 * where timestamp is 13-digit Unix epoch milliseconds.
 * Session ID is expected to be 8 lowercase hex chars.
 *
 * @param filename - The capture filename to parse
 * @returns The extracted session ID or null if not found
 */
export function extractSessionId(filename: string): string | null {
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
export function extractSource(filename: string): string | null {
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
 * Validate capture timestamp and return ISO string or null if invalid.
 */
export function validateCaptureTimestamp(timestamp: unknown): string | null {
  if (typeof timestamp !== "string") return null;
  const date = new Date(timestamp);
  return isNaN(date.getTime()) ? null : timestamp;
}

/**
 * Extract capture metadata from parsed data.
 */
export async function getSessionMetadata(
  filename: string,
  data: Record<string, unknown>,
): Promise<
  Omit<Session, "requestBody" | "responseBody" | "timings"> & {
    requestBody: Record<string, unknown>;
    responseBody: string | null;
    timings: Session["timings"];
  }
> {
  const sessionId = extractSessionId(filename);
  const source =
    typeof data.source === "string"
      ? data.source
      : (extractSource(filename) ?? "unknown");
  const responseStatus =
    typeof data.responseStatus === "number"
      ? data.responseStatus
      : Number(data.responseStatus) || 0;
  const responseIsStreaming =
    typeof data.responseIsStreaming === "boolean"
      ? data.responseIsStreaming
      : data.responseIsStreaming === true ||
        data.responseIsStreaming === "true";

  const rawTimings =
    data.timings && typeof data.timings === "object"
      ? (data.timings as Record<string, unknown>)
      : {};
  const timings = {
    total_ms:
      typeof rawTimings.total_ms === "number"
        ? rawTimings.total_ms
        : Number(rawTimings.total_ms) || 0,
  };

  const validatedTimestamp = validateCaptureTimestamp(data.timestamp);

  return {
    id: filename,
    sessionId: sessionId ?? "",
    source,
    provider: typeof data.provider === "string" ? data.provider : "unknown",
    apiFormat: typeof data.apiFormat === "string" ? data.apiFormat : "unknown",
    targetUrl: typeof data.targetUrl === "string" ? data.targetUrl : "",
    requestBody:
      typeof data.requestBody === "object" && data.requestBody !== null
        ? (data.requestBody as Record<string, unknown>)
        : {},
    responseBody:
      typeof data.responseBody === "string" ? data.responseBody : null,
    responseStatus,
    responseIsStreaming,
    timestamp: validatedTimestamp ?? new Date().toISOString(),
    timings,
  };
}
