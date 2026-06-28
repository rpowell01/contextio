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
  id: string;
  name: string;
  description: string;
  rules: RedactionRule[];
}

export interface RedactionRule {
  id: string;
  pattern: string;
  replacement: string;
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