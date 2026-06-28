/**
 * Proxy configuration resolution.
 *
 * Merges programmatic overrides with environment variables and applies
 * safe defaults. All upstream URLs, bind address, port, and feature
 * flags are resolved here before the proxy starts.
 */

import type { ProxyConfig, Upstreams } from "@contextio/core";

/**
 * Normalize an upstream URL by stripping trailing /v1 if present.
 * The request path already contains API version segments, so having
 * /v1 in both the base URL and the path would cause double-prefixing.
 *
 * URLs without a trailing /v1 pass through unchanged.
 * Empty/null URLs are returned as-is (validation happens at a higher level).
 */
function normalizeUpstreamUrl(url: string): string {
  if (!url || typeof url !== "string") {
    return url;
  }
  return url.replace(/\/v1$/, "");
}

/**
 * Fully resolved config with all defaults applied.
 */
export interface ResolvedProxyConfig {
  upstreams: Upstreams;
  bindHost: string;
  port: number;
  allowTargetOverride: boolean;
  strictUrlForwarding: boolean;
}

/**
 * Resolve final proxy config from environment variables and overrides.
 *
 * Priority: programmatic overrides > environment variables > defaults.
 *
 * Environment variables:
 * - `UPSTREAM_OPENAI_URL`, `UPSTREAM_ANTHROPIC_URL`, etc. for upstream URL defaults
 * - `UPSTREAM_NVIDIA_URL` for NVIDIA API (default: https://integrate.api.nvidia.com)
 * - `UPSTREAM_KILO_URL` for Kilo Code Gateway (default: https://api.kilo.ai/api/gateway)
 * - `UPSTREAM_OPENROUTER_URL` for OpenRouter (default: https://openrouter.ai/api)
 * - `CONTEXT_PROXY_BIND_HOST` for bind address (default: "127.0.0.1")
 * - `CONTEXT_PROXY_PORT` for port (default: 4040)
 * - `STRICT_URL_FORWARDING=true` to ignore x-<provider>-baseurl headers and use configured upstreams exclusively
 *
 * Header-based routing (takes precedence over env vars unless `STRICT_URL_FORWARDING=true`):
 * - `x-nvidia-baseurl`: Override NVIDIA upstream URL
 * - `x-kilo-baseurl`: Override Kilo upstream URL
 * - `x-openrouter-baseurl`: Override OpenRouter upstream URL
 */
export function resolveConfig(
  overrides?: ProxyConfig,
): ResolvedProxyConfig {
  const defaultUpstreams: Upstreams = {
    openai: process.env.UPSTREAM_OPENAI_URL || "https://api.openai.com",
    anthropic:
      process.env.UPSTREAM_ANTHROPIC_URL || "https://api.anthropic.com",
    chatgpt: process.env.UPSTREAM_CHATGPT_URL || "https://chatgpt.com",
    gemini:
      process.env.UPSTREAM_GEMINI_URL ||
      "https://generativelanguage.googleapis.com",
    geminiCodeAssist:
      process.env.UPSTREAM_GEMINI_CODE_ASSIST_URL ||
      "https://cloudcode-pa.googleapis.com",
    vertex:
      process.env.UPSTREAM_VERTEX_URL ||
      "https://us-central1-aiplatform.googleapis.com",
nvidia:
    process.env.UPSTREAM_NVIDIA_URL ||
    "https://integrate.api.nvidia.com",
  kilo:
    process.env.UPSTREAM_KILO_URL ||
    "https://api.kilo.ai/api/gateway",
  openrouter:
    process.env.UPSTREAM_OPENROUTER_URL ||
    "https://openrouter.ai/api",
  };

  const bindHost =
    overrides?.bindHost ||
    process.env.CONTEXT_PROXY_BIND_HOST ||
    "127.0.0.1";

  const port =
    overrides?.port ??
    parseInt(process.env.CONTEXT_PROXY_PORT || "4040", 10);

  const allowTargetOverride =
    overrides?.allowTargetOverride ??
    process.env.CONTEXT_PROXY_ALLOW_TARGET_OVERRIDE === "1";

  const strictUrlForwarding =
    overrides?.strictUrlForwarding ??
    process.env.STRICT_URL_FORWARDING === "true";

  const upstreams: Upstreams = {
    ...defaultUpstreams,
    ...overrides?.upstreams,
  };

  // Normalize upstream URLs: strip trailing /v1 to avoid double-prefixing
  const normalizedUpstreams: Upstreams = {
    openai: normalizeUpstreamUrl(upstreams.openai),
    anthropic: normalizeUpstreamUrl(upstreams.anthropic),
    chatgpt: normalizeUpstreamUrl(upstreams.chatgpt),
    gemini: normalizeUpstreamUrl(upstreams.gemini),
    geminiCodeAssist: normalizeUpstreamUrl(upstreams.geminiCodeAssist),
    vertex: normalizeUpstreamUrl(upstreams.vertex),
    nvidia: normalizeUpstreamUrl(upstreams.nvidia),
    kilo: normalizeUpstreamUrl(upstreams.kilo),
    openrouter: normalizeUpstreamUrl(upstreams.openrouter),
  };

  return {
    upstreams: normalizedUpstreams,
    bindHost,
    port,
    allowTargetOverride,
    strictUrlForwarding,
  };
}
