"use client";

import { MainLayout } from "@/components/main-layout";
import { apiClient } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Capture, CaptureWithRedaction } from "@/types/api";
import { useState, useEffect } from "react";

export default function CapturesPage() {
  const [captures, setCaptures] = useState<(Capture | CaptureWithRedaction)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCaptures = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getCaptures();
      setCaptures(response.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptures();
  }, []);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">API Captures</h1>
            <p className="text-muted-foreground">
              Captured API request/response pairs with redaction details
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
            <p className="text-destructive">Error: {error}</p>
            <button
              onClick={fetchCaptures}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}

        {loading && !error && (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-muted p-3">
                    <div className="h-5 w-5 bg-muted-foreground/20 rounded" />
                  </div>
                  <div>
                    <div className="h-4 bg-muted-foreground/20 rounded mb-1" style={{ width: "200px" }} />
                    <div className="h-3 bg-muted-foreground/10 rounded" style={{ width: "150px" }} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-3 bg-muted-foreground/20 rounded mb-1" style={{ width: "60px" }} />
                  <div className="h-3 bg-muted-foreground/10 rounded" style={{ width: "100px" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && captures.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
            <svg className="h-12 w-12 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10h10M7 14h6m-1 8l-4-4m0 0l4-4" />
            </svg>
            <h3 className="font-semibold mb-2">No captures yet</h3>
            <p className="text-sm text-muted-foreground">
              Start the logger plugin to capture API requests.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {captures.map((capture) => (
              <div
                key={capture.id}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h5.5a2 2 0 002-2V9a2 2 0 00-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">{capture.provider} - {capture.method}</div>
                    <div className="text-sm text-muted-foreground">
                      Status: {capture.responseStatus} • Source: {capture.source ?? "Unknown"}
                      {"redaction" in capture && capture.redaction && (
                        <span className="ml-2 text-indigo-600">
                          • {capture.redaction.totalRedactions} redactions
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono">#{capture.sessionId?.slice(0, 8) ?? "N/A"}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(capture.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}