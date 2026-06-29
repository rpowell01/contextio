import type { Session, ProxyStatus, SessionStats, ContainerEnvVar } from "@/types/api";

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
}

export const apiClient = new APIClient();