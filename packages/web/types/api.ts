/**
 * API type definitions for the web package.
 * 
 * This file contains all TypeScript interfaces and types used for API
 * request/response handling, session management, provider configurations,
 * logging, and metrics.
 */

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
  /** Raw response body as string (optional, nullable) */
  responseBody?: string | null;
  /** ISO timestamp of when the session was created */
  timestamp: string;
  /** Timing information in milliseconds */
  timings: {
    /** Total time in milliseconds for the session */
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
  /** Human-readable uptime string (optional) */
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
  /** Optional context strings for rule matching */
  context?: string[];
  /** Optional window size for context matching */
  contextWindow?: number;
}

/**
 * List of allowed strings and patterns for filtering.
 */
export interface Allowlist {
  /** Array of strings to always allow (optional) */
  strings?: string[];
  /** Array of regex patterns to always allow (optional) */
  patterns?: string[];
}

/**
 * Path filtering configuration for including or excluding specific routes.
 */
export interface Paths {
  /** Array of paths to exclusively include (optional) */
  only?: string[];
  /** Array of paths to skip/exclude (optional) */
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
    /** Time in milliseconds to send the request */
    send_ms: number;
    /** Time in milliseconds to wait for response */
    wait_ms: number;
    /** Time in milliseconds to receive the response */
    receive_ms: number;
    /** Total time in milliseconds for the capture */
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
 * Pagination metadata for API responses.
 */
export interface PaginationMeta {
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items available */
  total: number;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Generic API response wrapper with optional pagination.
 */
export type APIResponse<T> = {
  /** Response data */
  data: T;
  /** Total count for paginated results (optional) */
  total?: number;
  /** Pagination metadata (optional) */
  pagination?: PaginationMeta;
  /** Error message if request failed (optional) */
  error?: string;
};

// --- Metrics ---

/**
 * Aggregated metrics data for API usage and system activity.
 */
export type MetricsData = {
  /** Traffic metrics over time */
  traffic: TrafficMetric[];
  /** Provider usage statistics */
  providers: ProviderUsage[];
  /** Redaction activity metrics */
  redactions: RedactionMetric[];
  /** Total bytes sent in requests */
  totalRequestBytes: number;
  /** Total bytes received in responses */
  totalResponseBytes: number;
  /** Total input tokens across all requests */
  totalInputTokens: number;
  /** Total output tokens across all responses */
  totalOutputTokens: number;
};

/**
 * Usage statistics for a specific API provider.
 */
export type ProviderUsage = {
  /** Provider identifier */
  provider: string;
  /** Number of requests made to this provider */
  requestCount: number;
  /** Total input tokens consumed */
  totalInputTokens: number;
  /** Total output tokens generated */
  totalOutputTokens: number;
};

/**
 * Redaction activity metric for a point in time.
 */
export type RedactionMetric = {
  /** ISO timestamp of the metric */
  timestamp: string;
  /** Number of redactions at this time */
  count: number;
};

/**
 * Time range configuration for metrics queries.
 */
export type TimeRange = {
  /** Value identifier for the time range */
  value: string;
  /** Human-readable label for display */
  label: string;
  /** Number of hours in the range */
  hours: number;
};

/**
 * Traffic metric for a point in time.
 */
export type TrafficMetric = {
  /** ISO timestamp of the metric */
  timestamp: string;
  /** Bytes sent in requests */
  requestBytes: number;
  /** Bytes received in responses */
  responseBytes: number;
};

// --- Container Environment Variables ---

/**
 * Environment variable configuration for a container.
 */
export interface ContainerEnvVar {
  /** The environment variable name/key */
  key: string;
  /** The environment variable value */
  value: string;
  /** Optional source identifier for where this variable originated */
  source?: string;
}

// --- Container Logs ---

/**
 * Log level severity types.
 */
export type LogLevel = "error" | "warn" | "info" | "debug";

/**
 * A single log entry from container output.
 */
export interface LogEntry {
  /** Unique identifier for the log entry */
  id: string;
  /** ISO timestamp when the log was recorded */
  timestamp: string;
  /** Log severity level */
  level: LogLevel;
  /** The log message content */
  message: string;
  /** Output stream source (stdout or stderr) */
  source: "stdout" | "stderr";
  /** Associated session ID if the log relates to a specific session */
  sessionId?: string;
}

/**
 * Container runtime information.
 */
export interface ContainerInfo {
  /** Unique container identifier */
  id: string;
  /** Human-readable container name */
  name: string;
  /** Current container status (e.g., 'running', 'stopped', 'exited') */
  status: string;
}

/**
 * Filter criteria for querying log entries.
 */
export interface LogsFilter {
  /** Array of log levels to include */
  levels: LogLevel[];
  /** Search string to filter log messages */
  search: string;
}

/**
 * Options for exporting logs in various formats.
 */
export interface LogsExportOptions {
  /** Output format for the exported logs */
  format: "json" | "text" | "csv";
  /** Filter criteria to apply to the export */
  filter: LogsFilter;
}
