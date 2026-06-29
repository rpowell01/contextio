"use client";

import { MainLayout } from "@/components/main-layout";
import { apiClient } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Capture, CaptureWithRedaction, PaginationMeta } from "@/types/api";
import { useState, useEffect } from "react";

const DEFAULT_PAGE_SIZE = 20;

export default function CapturesPage() {
  const [captures, setCaptures] = useState<(Capture | CaptureWithRedaction)[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const fetchCaptures = async (page: number = currentPage, pageSizeParam: number = pageSize) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getCaptures({ page, pageSize: pageSizeParam });
      setCaptures(response.data);
      setPagination(response.pagination ?? null);
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="pageSize" className="text-sm text-muted-foreground">
                Per page:
              </label>
              <select
                id="pageSize"
                value={pageSize}
                onChange={(e) => {
                  const newPageSize = parseInt(e.target.value, 10);
                  setPageSize(newPageSize);
                  setCurrentPage(1);
                  fetchCaptures(1, newPageSize);
                }}
                className="rounded border border-input bg-background px-2 py-1 text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
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

        {/* Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">
              Showing {captures.length} of {pagination.total} captures
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newPage = Math.max(1, (pagination.page ?? 1) - 1);
                  setCurrentPage(newPage);
                  fetchCaptures(newPage, pageSize);
                }}
                disabled={(pagination.page ?? 1) <= 1}
                className="rounded px-3 py-1 text-sm border border-input bg-background hover:bg-accent disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => {
                  const newPage = (pagination.page ?? 1) + 1;
                  setCurrentPage(newPage);
                  fetchCaptures(newPage, pageSize);
                }}
                disabled={(pagination.page ?? 1) >= pagination.totalPages}
                className="rounded px-3 py-1 text-sm border border-input bg-background hover:bg-accent disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}