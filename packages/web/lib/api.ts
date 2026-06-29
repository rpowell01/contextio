import type { Session, ProxyStatus, SessionStats, ContainerEnvVar, LogEntry, LogsFilter } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4040";

class APIClient {
  private async request<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
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
    const response = await fetch(`${API_BASE_URL}/api/restart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.json();
  }

async getContainerEnvVars(containerId: string, signal?: AbortSignal): Promise<ContainerEnvVar[]> {
    return this.request(`/api/containers/${containerId}/env`, signal);
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
    const response = await fetch(`${API_BASE_URL}/api/logs?${params.toString()}`);
    if (!response.ok) throw new Error("Failed to fetch logs");
    const data = await response.json();
    return data.logs;
  }

  async streamLogs(containerId: string, onChunk: (log: LogEntry) => void): Promise<void> {
    const params = new URLSearchParams();
    params.set("containerId", encodeURIComponent(containerId));
    params.set("stream", "true");
    const response = await fetch(`${API_BASE_URL}/api/logs?${params.toString()}`);
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
  }

  async clearLogs(containerId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ containerId }),
    });
    return response.json();
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
}

export const apiClient = new APIClient();