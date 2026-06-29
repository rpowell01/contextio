import { NextRequest, NextResponse } from "next/server";
import { LogEntry, LogLevel } from "@/types/api";

// Input validation helpers
function sanitizeString(value: string | null, maxLength = 256): string | null {
  if (!value) return null;
  // Remove potentially dangerous characters and limit length
  return value.slice(0, maxLength).replace(/[<>'"&]/g, "");
}

function validateContainerId(value: string | null): string | null {
  if (!value) return null;
  // Container IDs should be alphanumeric with limited special chars
  const sanitized = sanitizeString(value, 128);
  if (!sanitized || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(sanitized)) {
    return null;
  }
  return sanitized;
}

function validateLogLevel(level: string): LogLevel | null {
  const validLevels: LogLevel[] = ["error", "warn", "info", "debug"];
  if (validLevels.includes(level as LogLevel)) {
    return level as LogLevel;
  }
  return null;
}

// Mock container logs service - in production this would connect to Docker API
// or a container orchestration system like Kubernetes
class ContainerLogsService {
  private logs: LogEntry[] = [];

  constructor() {
    // Initialize with some sample logs for demonstration
    this.initializeSampleLogs();
  }

  private initializeSampleLogs() {
    const messages = [
      { level: "info" as LogLevel, message: "Container started successfully", source: "stdout" as const },
      { level: "info" as LogLevel, message: "Loading configuration from /app/config.yaml", source: "stdout" as const },
      { level: "debug" as LogLevel, message: "Configuration loaded: {port: 4040, logLevel: info}", source: "stdout" as const },
      { level: "info" as LogLevel, message: "Proxy server listening on port 4040", source: "stdout" as const },
      { level: "warn" as LogLevel, message: "Rate limit threshold approaching for provider: openai", source: "stderr" as const },
      { level: "error" as LogLevel, message: "Failed to connect to upstream: timeout after 30s", source: "stderr" as const },
      { level: "info" as LogLevel, message: "Retrying connection (attempt 2/3)", source: "stdout" as const },
      { level: "info" as LogLevel, message: "Connection restored to upstream", source: "stdout" as const },
    ];

    messages.forEach((msg, i) => {
      this.logs.push({
        id: `log-${i}`,
        timestamp: new Date(Date.now() - (messages.length - i) * 1000).toISOString(),
        ...msg,
        sessionId: "sess-demo123",
      });
    });
  }

  getLogs(_containerId: string, filter?: { levels?: LogLevel[]; search?: string }): LogEntry[] {
    let filtered = [...this.logs];

    if (filter?.levels && filter.levels.length > 0) {
      filtered = filtered.filter((log) => filter.levels!.includes(log.level));
    }

    if (filter?.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(searchLower) ||
          log.source.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }

  clearLogs(_containerId: string): void {
    // In a real implementation, this would clear logs for the specific container
    this.logs = [];
  }

  addLog(entry: Omit<LogEntry, "id">): void {
    this.logs.push({
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });
  }

  async *streamLogsGenerator(containerId: string, filter?: { levels?: LogLevel[]; search?: string }): AsyncGenerator<string, void, unknown> {
    for (const log of this.getLogs(containerId, filter)) {
      yield JSON.stringify(log) + "\n";
      // Simulate real-time streaming with small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

const logsService = new ContainerLogsService();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawContainerId = searchParams.get("containerId");
  const sessionId = searchParams.get("sessionId");
  const rawSearch = searchParams.get("search");
  const streamMode = searchParams.get("stream") === "true";

  // Validate and sanitize inputs
  const containerId = validateContainerId(rawContainerId) || "demo-container";
  const search = sanitizeString(rawSearch) || undefined;
  
  const rawLevels = searchParams.get("levels")?.split(",").filter(Boolean) || [];
  const levels = rawLevels.map(validateLogLevel).filter((l): l is LogLevel => l !== null);

  // Handle streaming response
  if (streamMode) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async pull(controller) {
        try {
          const logGenerator = logsService.streamLogsGenerator(containerId, { levels, search });
          for await (const chunk of logGenerator) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Handle filtered/export response
  const logs = logsService.getLogs(containerId, { levels, search });

  return NextResponse.json({ logs, containerId, sessionId });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, containerId } = body;

    // Validate inputs
    const sanitizedContainerId = validateContainerId(containerId) || "demo-container";

    if (action === "clear") {
      logsService.clearLogs(sanitizedContainerId);
      return NextResponse.json({ success: true, message: "Logs cleared" });
    }

    if (action === "stream" && sanitizedContainerId) {
      // For SSE streaming, we'll use GET with stream=true parameter
      return NextResponse.json({ 
        success: true, 
        message: "Use GET /api/logs?stream=true for streaming",
        streamUrl: `/api/logs?containerId=${encodeURIComponent(sanitizedContainerId)}&stream=true` 
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}

// Export types for use in other files
export type { LogEntry, LogLevel };