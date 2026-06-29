import { MainLayout } from "@/components/main-layout";
import { formatBytes, formatNumber } from "@/lib/utils";
import type { MetricsData } from "@/types/api";

/**
 * Fetch metrics data from the API.
 */
async function fetchMetrics(): Promise<MetricsData> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4040";
  const response = await fetch(`${API_URL}/api/metrics`, {
    next: { revalidate: 30 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch metrics: ${response.statusText}`);
  }

  const data = await response.json();

  // Validate the response matches the expected MetricsData structure
  if (!isValidMetricsData(data)) {
    throw new Error("Invalid metrics data received from API");
  }

  return data;
}

/**
 * Type guard to validate MetricsData structure.
 */
function isValidMetricsData(data: unknown): data is MetricsData {
  if (!data || typeof data !== "object") return false;
  const metrics = data as Record<string, unknown>;
  return (
    typeof metrics.totalInputTokens === "number" &&
    typeof metrics.totalOutputTokens === "number" &&
    typeof metrics.totalRequestBytes === "number" &&
    typeof metrics.totalResponseBytes === "number" &&
    Array.isArray(metrics.providers) &&
    Array.isArray(metrics.redactions) &&
    Array.isArray(metrics.traffic)
  );
}

export default async function MetricsPage() {
  let metrics: MetricsData | null = null;
  let error: string | null = null;

  try {
    metrics = await fetchMetrics();
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metrics</h1>
          <p className="text-muted-foreground">
            Monitor API traffic, usage, and redaction statistics
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
            <p className="text-destructive">Error: {error}</p>
          </div>
        )}

        {metrics && (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Total Requests</div>
                <div className="text-2xl font-bold">
                  {metrics.providers.reduce((sum, p) => sum + p.requestCount, 0)}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Input Tokens</div>
                <div className="text-2xl font-bold">
                  {formatNumber(metrics.totalInputTokens)}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Output Tokens</div>
                <div className="text-2xl font-bold">
                  {formatNumber(metrics.totalOutputTokens)}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Total Redactions</div>
                <div className="text-2xl font-bold">
                  {formatNumber(metrics.redactions.reduce((sum, r) => sum + r.count, 0))}
                </div>
              </div>
            </div>

            {/* Traffic Summary */}
            <div className="rounded-lg border p-4">
              <h3 className="text-lg font-semibold mb-4">Traffic Summary</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Request Bytes</div>
                  <div className="text-xl font-medium">
                    {formatBytes(metrics.totalRequestBytes)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Response Bytes</div>
                  <div className="text-xl font-medium">
                    {formatBytes(metrics.totalResponseBytes)}
                  </div>
                </div>
              </div>
            </div>

            {/* Provider Usage */}
            <div className="rounded-lg border p-4">
              <h3 className="text-lg font-semibold mb-4">Provider Usage</h3>
              <div className="space-y-2">
                {metrics.providers.map((provider) => (
                  <div
                    key={provider.provider}
                    className="flex items-center justify-between rounded border p-3"
                  >
                    <span className="font-medium">{provider.provider}</span>
                    <div className="text-right text-sm">
                      <div>{provider.requestCount} requests</div>
                      <div className="text-muted-foreground">
                        {formatNumber(provider.totalInputTokens)} in,{" "}
                        {formatNumber(provider.totalOutputTokens)} out
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}