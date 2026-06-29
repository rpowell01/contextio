import type { Session, ProxyStatus, SessionStats, Capture, CaptureWithRedaction, APIResponse } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4040";
const DEFAULT_TIMEOUT = 30000; // 30 seconds

class APIClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        signal: controller.signal,
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
        throw new Error(`API request failed: ${response.status} ${errorMessage}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("Request timeout");
        }
        throw error;
      }
      throw new Error("Network error");
    }
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

  async getCaptures(filters?: {
    sessionId?: string;
    source?: string;
    status?: string;
    from?: string;
    to?: string;
    redactionType?: string;
    includeRedaction?: boolean;
  }): Promise<APIResponse<(Capture | CaptureWithRedaction)[]>> {
    const params = new URLSearchParams();
    if (filters?.sessionId) params.set("sessionId", filters.sessionId);
    if (filters?.source) params.set("source", filters.source);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.from) params.set("from", filters.from);
    if (filters?.to) params.set("to", filters.to);
    if (filters?.redactionType) params.set("redactionType", filters.redactionType);
    if (filters?.includeRedaction) params.set("includeRedaction", "true");

    const query = params.toString();
    return this.request(`/api/captures${query ? `?${query}` : ""}`);
  }
}

export const apiClient = new APIClient();