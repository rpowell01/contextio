import type { ContainerEnvVar } from "@/types/api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: _id } = await params;

  try {
    // In a real implementation, this would fetch from Docker API
    // For now, return mock env vars for demo
    const envVars: ContainerEnvVar[] = [
      { key: "CONTEXT_PROXY_BIND_HOST", value: "0.0.0.0", source: "container" },
      { key: "CONTEXT_PROXY_PORT", value: "4040", source: "container" },
      { key: "CONTEXT_PROXY_PLUGINS", value: "/app/logger-plugin.js,/app/redact-plugin.js", source: "container" },
      { key: "REDACT_POLICY_FILE", value: "/app/custom-policy.json", source: "mounted" },
      { key: "REDACT_REVERSIBLE", value: "true", source: "container" },
      { key: "LOGGER_CAPTURE_DIR", value: "/home/node/.contextio/captures", source: "container" },
      { key: "LOGGER_MAX_SESSIONS", value: "0", source: "container" },
      { key: "REDACT_PRESET", value: "pii", source: "container" },
      { key: "UPSTREAM_OPENAI_URL", value: "https://api.openai.com/v1", source: "container" },
      { key: "UPSTREAM_ANTHROPIC_URL", value: "https://api.anthropic.com", source: "container" },
    ];

    return Response.json(envVars);
  } catch (error) {
    console.error("Error in container env API:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}