/**
 * Represents an API session with request/response details.
 */
export interface Session {
  /** Unique identifier for the session */
  id: string;
  /** Session identifier from the API */
  sessionId: string;
  /** Source of the session (e.g., provider name) */
  source: string;
  /** API provider name */
  provider: string;
  /** API format (e.g., 'openai', 'anthropic') */
  apiFormat: string;
  /** Target URL for the API request */
  targetUrl: string;
  /** Request body as key-value pairs */
  requestBody: Record<string, unknown>;
  /** HTTP response status code */
  responseStatus: number;
  /** Whether the response is streaming */
  responseIsStreaming: boolean;
  /** Raw response body as string */
  responseBody: string;
  /** ISO timestamp of when the session was created */
  timestamp: string;
  /** Timing information in milliseconds */
  timings: {
    total_ms: number;
  };
}

/**
 * Statistics for an API session including token usage.
 */
export interface SessionStats {
  /** Session identifier */
  sessionId: string;
  /** Total number of requests in the session */
  totalRequests: number;
  /** Token usage breakdown */
  totalTokens: {
    /** Input tokens */
    input: number;
    /** Output tokens */
    output: number;
    /** Total tokens */
    total: number;
  };
  /** First message in the session */
  firstMessage: string;
  /** Optional system prompt */
  systemPrompt?: string;
  /** Optional array of tool definitions */
  toolDefinitions?: string[];
}

/**
 * Configuration for an API provider.
 */
export interface ProviderConfig {
  /** Unique provider identifier */
  id: string;
  /** Human-readable provider name */
  name: string;
  /** Base URL for the provider's API */
  baseUrl: string;
  /** List of available model names */
  models: string[];
}

/**
 * Status of the proxy server.
 */
export interface ProxyStatus {
  /** Whether the proxy is currently running */
  running: boolean;
  /** Process ID if running */
  pid?: number;
  /** Port the proxy is listening on */
  port: number;
  /** Human-readable uptime string */
  uptime?: string;
  /** Number of active sessions */
  sessions: number;
}

/**
 * Redaction policy defining rules for sensitive data filtering.
 */
export interface RedactionPolicy {
  /** Unique policy identifier */
  id: string;
  /** Human-readable policy name */
  name: string;
  /** Description of the policy's purpose */
  description: string;
  /** Array of redaction rules */
  rules: RedactionRule[];
}

/**
 * A single redaction rule with pattern matching.
 */
export interface RedactionRule {
  /** Unique rule identifier */
  id: string;
  /** Regex pattern to match sensitive data */
  pattern: string;
  /** Replacement string or placeholder */
  replacement: string;
  context?: string[];
  contextWindow?: number;
}

export interface Allowlist {
  strings?: string[];
  patterns?: string[];
}

export interface Paths {
  only?: string[];
  skip?: string[];
}

/**
 * A capture file from the logger plugin containing API request/response data.
 */
export interface Capture {
  /** Unique identifier (filename) for the capture */
  id: string;
  /** Session identifier this capture belongs to, if any */
  sessionId: string | null;
  /** Source system that generated the capture */
  source: string | null;
  /** API provider name */
  provider: string;
  /** API format (e.g., 'openai', 'anthropic') */
  apiFormat: string;
  /** Target URL for the API request */
  targetUrl: string;
  /** HTTP method used (GET, POST, etc.) */
  method: string;
  /** Size of request body in bytes */
  requestBytes: number;
  /** Size of response body in bytes */
  responseBytes: number;
  /** HTTP response status code */
  responseStatus: number;
  /** Whether the response is streaming */
  responseIsStreaming: boolean;
  /** ISO timestamp of when the capture was made */
  timestamp: string;
  /** Timing information in milliseconds */
  timings: {
    send_ms: number;
    wait_ms: number;
    receive_ms: number;
    total_ms: number;
  };
}

/**
 * Redaction detail for a specific rule match found in captured data.
 */
export interface RedactionMatch {
  /** Identifier of the redaction rule that matched */
  ruleId: string;
  /** Original sensitive value (placeholder) */
  original: string;
  /** The redacted placeholder string (e.g., [EMAIL_1]) */
  placeholder: string;
  /** JSON path where the match was found */
  path: string;
}

/**
 * Redaction information for a capture including counts and matches.
 */
export interface RedactionDetails {
  /** Total number of redactions in this capture */
  totalRedactions: number;
  /** Count of redactions grouped by rule ID */
  byRule: Record<string, number>;
  /** Individual redaction matches with details */
  matches: RedactionMatch[];
}

/**
 * A capture with full redaction details included.
 */
export interface CaptureWithRedaction extends Capture {
  /** Redaction details for this capture */
  redaction: RedactionDetails;
}

/**
 * Generic API response wrapper with optional pagination.
 */
export type APIResponse<T> = {
  /** Response data */
  data: T;
  /** Total count for paginated results */
  total?: number;
  /** Error message if request failed */
  error?: string;
};

// --- Metrics ---

export type MetricsData = {
  traffic: TrafficMetric[];
  providers: ProviderUsage[];
  redactions: RedactionMetric[];
  totalRequestBytes: number;
  totalResponseBytes: number;
  totalInputTokens: number;
  totalOutputTokens: number;
};

export type ProviderUsage = {
  provider: string;
  requestCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
};

export type RedactionMetric = {
  timestamp: string;
  count: number;
};

export type TimeRange = {
  value: string;
  label: string;
  hours: number;
};

export type TrafficMetric = {
  timestamp: string;
  requestBytes: number;
  responseBytes: number;
};

// --- Container Environment Variables ---

export interface ContainerEnvVar {
  key: string;
  value: string;
  source?: string;
}

// --- Container Logs ---

export type LogLevel = "error" | "warn" | "info" | "debug";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  source: "stdout" | "stderr";
  sessionId?: string;
}

export interface ContainerInfo {
  id: string;
  name: string;
  status: string;
}

export interface LogsFilter {
  levels: LogLevel[];
  search: string;
}

export interface LogsExportOptions {
  format: "json" | "text" | "csv";
  filter: LogsFilter;
}
