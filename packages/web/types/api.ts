export interface Session {
  id: string;
  sessionId: string;
  source: string;
  provider: string;
  apiFormat: string;
  targetUrl: string;
  requestBody: Record<string, unknown>;
  responseStatus: number;
  responseIsStreaming: boolean;
  responseBody: string;
  timestamp: string;
  timings: {
    total_ms: number;
  };
}

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

export interface RedactionPolicy {
  extends?: "secrets" | "pii" | "strict";
  rules?: RedactionRule[];
  allowlist?: Allowlist;
  paths?: Paths;
}

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