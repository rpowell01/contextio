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

export type Session = {
  sessionId: string;
  timestamp: string;
  source: string;
  provider: string;
  model: string;
  targetUrl?: string;
  requestBody?: unknown;
  responseBody?: unknown;
  responseStatus?: number;
  responseIsStreaming?: boolean;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
};

export interface SessionStats {
  sessionId: string;
  totalRequests: number;
  totalTokens: {
    input: number;
    output: number;
    total: number;
  };
  firstMessage: string;
  systemPrompt?: string;
  toolDefinitions?: string[];
}

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  models: string[];
}

export type RedactionPolicy = {
  extends: "secrets" | "pii" | "strict";
  rules?: RedactionRule[];
  allowlist?: Allowlist;
  paths?: Paths;
};

export interface RedactionRule {
  id: string;
  pattern: string;
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

export interface ProxyStatus {
  running: boolean;
  pid?: number;
  port: number;
  uptime?: string;
  sessions: number;
}

export type APIResponse<T> = {
  data: T;
  error?: string;
};

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