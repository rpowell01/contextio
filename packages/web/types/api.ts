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