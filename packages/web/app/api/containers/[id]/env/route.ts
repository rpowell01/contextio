import type { ProxyEnvVar } from "@/types/api";
import { apiClient } from "@/lib/api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await params; // consume params but we don't need the ID since we query the proxy directly

  try {
    // Fetch real environment variables from the proxy admin API
    const envVars = await apiClient.getProxyEnvVars();
    return Response.json(envVars);
  } catch (error) {
    console.error("Error in container env API:", error);
    // Fallback to mock data if proxy is unreachable
    const mockEnvVars: ProxyEnvVar[] = [
      { key: "CONTEXT_PROXY_BIND_HOST", value: "0.0.0.0", source: "default" },
      { key: "CONTEXT_PROXY_PORT", value: "4040", source: "default" },
      { key: "CONTEXT_PROXY_PLUGINS", value: "/app/logger-plugin.js,/app/redact-plugin.js", source: "default" },
      { key: "REDACT_POLICY_FILE", value: "/app/custom-policy.json", source: "default" },
      { key: "REDACT_REVERSIBLE", value: "true", source: "default" },
      { key: "LOGGER_CAPTURE_DIR", value: "/home/node/.contextio/captures", source: "default" },
      { key: "LOGGER_MAX_SESSIONS", value: "0", source: "default" },
      { key: "REDACT_PRESET", value: "pii", source: "default" },
      { key: "UPSTREAM_OPENAI_URL", value: "https://api.openai.com/v1", source: "default" },
      { key: "UPSTREAM_ANTHROPIC_URL", value: "https://api.anthropic.com", source: "default" },
    ];
    return Response.json(mockEnvVars);
  }
}