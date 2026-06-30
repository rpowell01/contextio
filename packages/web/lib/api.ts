import type { Session, ProxyStatus, SessionStats, Capture, CaptureWithRedaction, APIResponse, ContainerEnvVar, LogEntry, LogsFilter } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4041";
const DEFAULT_TIMEOUT = 30000; // 30 seconds

interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 300,
  maxDelay: 10000,
  backoffFactor: 2,
};

/**
 * Determines if an error is transient and should be retried.
 */
function isTransientError(error: unknown, status?: number): boolean {
  if (status) {
    return status === 429 || (status >= 500 && status < 600);
  }
  if (error instanceof Error) {
    // Network errors and timeouts are transient, but AbortError is intentional cancellation
    return error.message.includes("timeout") || error.message.includes("Network error");
  }
  return false;
}

/**
 * Sleeps for a specified duration in milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class APIClient {
  /**
   * Combines multiple AbortSignals into a single signal.
   * Aborts when any of the provided signals abort.
   */
  private combineSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    
    const abortHandler = () => {
      controller.abort();
    };
    
    const cleanup = () => {
      signals.forEach(signal => {
        signal.removeEventListener("abort", abortHandler);
      });
    };
    
    signals.forEach(signal => {
      signal.addEventListener("abort", abortHandler);
    });
    
    // Clean up listeners when our controller is aborted
    controller.signal.addEventListener("abort", cleanup);
    
    return controller.signal;
  }

  private async request<T>(endpoint: string, options?: RequestInit, retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG): Promise<T> {
    let lastError: Error | undefined;
    let retryDelay = retryConfig.initialDelay;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

      // Combine provided signal with timeout controller signal
      const providedSignal = options?.signal;
      const signal = providedSignal
        ? this.combineSignals([providedSignal, controller.signal])
        : controller.signal;

      // Check if already aborted before making request
      if (signal.aborted) {
        clearTimeout(timeoutId);
        throw new Error("Request aborted");
      }

      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          signal,
          headers: {
            "Content-Type": "application/json",
            ...(options?.headers || {}),
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorMessage = response.statusText;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || response.statusText;
          } catch {
            // Response body is not JSON or empty
          }
          const error = new Error(`API request failed: ${response.status} ${errorMessage}`);
          
          // Check if we should retry for transient errors
          if (attempt < retryConfig.maxRetries && isTransientError(error, response.status)) {
            // Check signal before sleeping
            if (signal.aborted) {
              throw new Error("Request aborted");
            }
            // Add jitter to prevent thundering herd
            const jitter = Math.random() * 100;
            await sleep(retryDelay + jitter);
            retryDelay = Math.min(retryDelay * retryConfig.backoffFactor, retryConfig.maxDelay);
            lastError = error;
            continue;
          }
          throw error;
        }

        const data = await response.json();
        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error) {
          if (error.name === "AbortError") {
            throw new Error("Request aborted");
          }
          
          // Check if we should retry for transient network errors
          if (attempt < retryConfig.maxRetries && isTransientError(error)) {
            // Check signal before sleeping
            if (signal.aborted) {
              throw new Error("Request aborted");
            }
            // Add jitter to prevent thundering herd
            const jitter = Math.random() * 100;
            await sleep(retryDelay + jitter);
            retryDelay = Math.min(retryDelay * retryConfig.backoffFactor, retryConfig.maxDelay);
            lastError = error;
            continue;
          }
          throw error;
        }
        throw new Error("Network error");
      }
    }
    
    throw lastError || new Error("Request failed");
  }

  async getSessions(): Promise<Session[]> {
    return this.request("/api/sessions");
  }

  async getSession(id: string): Promise<Session> {
    return this.request(`/api/sessions/${id}`);
  }

  async getSessionStats(sessionId: string): Promise<SessionStats> {
    return this.request(`/api/sessions/${sessionId}/stats`);
  }

  async getProxyStatus(): Promise<ProxyStatus> {
    return this.request("/api/status");
  }

  async restartProxy(): Promise<{ success: boolean }> {
    return this.request("/api/restart", { method: "POST" });
  }

  async getContainerEnvVars(containerId: string, signal?: AbortSignal): Promise<ContainerEnvVar[]> {
    return this.request(`/api/containers/${containerId}/env`, { signal });
  }

  // Logs API
  async getLogs(containerId: string, filter?: LogsFilter): Promise<LogEntry[]> {
    const params = new URLSearchParams();
    params.set("containerId", encodeURIComponent(containerId));
    if (filter?.levels && filter.levels.length > 0) {
      params.set("levels", filter.levels.join(","));
    }
    if (filter?.search) {
      params.set("search", encodeURIComponent(filter.search));
    }
    const data = await this.request<{ logs: LogEntry[] }>(`/api/logs?${params.toString()}`);
    return data.logs;
  }

  async streamLogs(
    containerId: string,
    onChunk: (log: LogEntry) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const params = new URLSearchParams();
    params.set("containerId", encodeURIComponent(containerId));
    params.set("stream", "true");

    const controller = new AbortController();
    
    // Combine provided signal with controller signal
    const combinedSignal = signal
      ? this.combineSignals([signal, controller.signal])
      : controller.signal;

    const responsePromise = fetch(`${API_BASE_URL}/api/logs?${params.toString()}`, {
      signal: combinedSignal,
    });

    try {
      const response = await responsePromise;
      if (!response.ok) throw new Error("Failed to stream logs");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            // Process any remaining buffer content before exiting
            if (buffer.trim()) {
              try {
                const log: LogEntry = JSON.parse(buffer.trim());
                onChunk(log);
              } catch {
                // Skip malformed final line
              }
            }
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          // Process complete lines, keep incomplete line in buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep the last (possibly incomplete) line
          for (const line of lines) {
            if (line.trim()) {
              try {
                const log: LogEntry = JSON.parse(line);
                onChunk(log);
              } catch {
                // Skip malformed lines
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request aborted");
      }
      throw error;
    }
  }

  async clearLogs(containerId: string): Promise<{ success: boolean }> {
    return this.request("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ containerId }),
    });
  }

  async exportLogs(containerId: string, format: "json" | "text" | "csv", filter: LogsFilter): Promise<string> {
    const logs = await this.getLogs(containerId, filter);
    
    switch (format) {
      case "json":
        return JSON.stringify(logs, null, 2);
      case "csv":
        return this.logsToCsv(logs);
      case "text":
        return logs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}`).join("\n");
      default:
        return JSON.stringify(logs, null, 2);
    }
  }

  private logsToCsv(logs: LogEntry[]): string {
    const header = "id,timestamp,level,source,message,sessionId";
    const rows = logs.map(l => 
      `${l.id},${l.timestamp},${l.level},${l.source},"${l.message.replace(/"/g, '""')}",${l.sessionId || ""}`
    );
    return [header, ...rows].join("\n");
  }

  async getCaptures(filters?: {
    sessionId?: string;
    source?: string;
    status?: string;
    from?: string;
    to?: string;
    redactionType?: string;
    includeRedaction?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<APIResponse<(Capture | CaptureWithRedaction)[]>> {
    const params = new URLSearchParams();
    if (filters?.sessionId) params.set("sessionId", filters.sessionId);
    if (filters?.source) params.set("source", filters.source);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.from) params.set("from", filters.from);
    if (filters?.to) params.set("to", filters.to);
    if (filters?.redactionType) params.set("redactionType", filters.redactionType);
    if (filters?.includeRedaction) params.set("includeRedaction", "true");
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.pageSize) params.set("pageSize", String(filters.pageSize));

    const query = params.toString();
    return this.request(`/api/captures${query ? `?${query}` : ""}`);
  }
}

export const apiClient = new APIClient();
