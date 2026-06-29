import fs from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import type { MetricsData, TrafficMetric, ProviderUsage, RedactionMetric } from "@/types/api";

const CAPTURE_DIR = join(homedir(), ".contextio", "captures");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

/**
 * List capture files from the capture directory.
 */
async function listCaptureFiles(): Promise<string[]> {
  try {
    const files = await fs.readdir(CAPTURE_DIR);
    return files.filter((f) => isValidFilename(f) && !f.endsWith(".tmp")).sort();
  } catch (error) {
    console.error("Error listing capture files:", error);
    return [];
  }
}

const MAX_FILENAME_LENGTH = 255;

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
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
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

/**
 * Parse a single capture file and extract metrics.
 */
function parseCapture(data: Record<string, unknown>): {
  traffic: TrafficMetric | null;
  providerUsage: ProviderUsage | null;
  redaction: RedactionMetric | null;
} {
  const timestamp = (data.timestamp as string) ?? new Date().toISOString();
  const provider = (data.provider as string) ?? "unknown";
  const requestBytes = (data.requestBytes as number) ?? 0;
  const responseBytes = (data.responseBytes as number) ?? 0;

  const traffic: TrafficMetric = {
    timestamp,
    requestBytes,
    responseBytes,
  };

  const providerUsage: ProviderUsage = {
    provider,
    requestCount: 1,
    totalInputTokens: 0,
    totalOutputTokens: 0,
  };

  const redaction: RedactionMetric = {
    timestamp,
    count: 0,
  };

  return { traffic, providerUsage, redaction };
}

/**
 * Aggregate metrics from all capture files.
 */
function aggregateMetrics(
  captures: Array<{
    traffic: TrafficMetric | null;
    providerUsage: ProviderUsage | null;
    redaction: RedactionMetric | null;
  }>,
): MetricsData {
  const traffic: TrafficMetric[] = [];
  const providerMap: Map<string, ProviderUsage> = new Map();
  const redactions: RedactionMetric[] = [];

  let totalRequestBytes = 0;
  let totalResponseBytes = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const capture of captures) {
    if (capture.traffic) {
      traffic.push(capture.traffic);
      totalRequestBytes += capture.traffic.requestBytes;
      totalResponseBytes += capture.traffic.responseBytes;
    }

    if (capture.providerUsage) {
      const existing = providerMap.get(capture.providerUsage.provider);
      if (existing) {
        existing.requestCount += capture.providerUsage.requestCount;
        existing.totalInputTokens += capture.providerUsage.totalInputTokens;
        existing.totalOutputTokens += capture.providerUsage.totalOutputTokens;
      } else {
        providerMap.set(capture.providerUsage.provider, { ...capture.providerUsage });
      }
    }

    if (capture.redaction) {
      redactions.push(capture.redaction);
    }
  }

  const providers = Array.from(providerMap.values());

  return {
    traffic,
    providers,
    redactions,
    totalRequestBytes,
    totalResponseBytes,
    totalInputTokens,
    totalOutputTokens,
  };
}

export async function GET(_request: Request): Promise<Response> {
  try {
    const files = await listCaptureFiles();
    const captures: Array<{
      traffic: TrafficMetric | null;
      providerUsage: ProviderUsage | null;
      redaction: RedactionMetric | null;
    }> = [];

    for (const filename of files) {
      try {
        const filepath = join(CAPTURE_DIR, filename);
        const stats = await fs.stat(filepath);
        if (stats.size > MAX_FILE_SIZE) {
          console.warn(`Capture file too large, skipping: ${filename}`);
          continue;
        }

        const raw = await fs.readFile(filepath, "utf8");
        const data = JSON.parse(raw) as Record<string, unknown>;
        captures.push(parseCapture(data));
      } catch (error) {
        console.error(`Error processing capture ${filename}:`, error);
        continue;
      }
    }

    const metrics = aggregateMetrics(captures);
    return Response.json(metrics);
  } catch (error) {
    console.error("Error in metrics API:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}