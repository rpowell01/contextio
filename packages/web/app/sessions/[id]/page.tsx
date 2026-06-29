import { MainLayout } from "@/components/main-layout";
import { LogsViewer } from "@/components/logs-viewer";
import { formatDate, isValidSession, safeJsonStringify } from "@/lib/utils";
import type { Session } from "@/types/api";
import Link from "next/link";

function renderResponseBody(body: unknown): React.ReactNode {
  if (typeof body === "string") {
    return body;
  }
  if (body === null || body === undefined) {
    return "{}";
  }
  return safeJsonStringify(body);
}

async function getSession(id: string): Promise<Session> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4040";
  const res = await fetch(`${API_URL}/api/sessions/${id}`);

  if (!res.ok) {
    throw new Error("Session not found");
  }

  const data = await res.json();

  // Validate the response
  if (!isValidSession(data)) {
    throw new Error("Invalid session data received from API");
  }

  return data;
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let session: Session | null = null;
  let error: string | null = null;

  try {
    session = await getSession(id);
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <Link
            href="/sessions"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to sessions
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mt-2">
            Session: {session?.sessionId || "Unknown"}
          </h1>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
            <p className="text-destructive">Error: {error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please try again or contact support if the problem persists.
            </p>
          </div>
        )}

        {!error && session && (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-3">Request</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Source:</span>{" "}
                    {session.source}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Provider:</span>{" "}
                    {session.provider}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Target:</span>{" "}
                    {session.targetUrl}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Timestamp:</span>{" "}
                    {formatDate(session.timestamp)}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-3">Response</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    {session.responseStatus}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Streaming:</span>{" "}
                    {session.responseIsStreaming ? "Yes" : "No"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-3">Request Body</h3>
              <pre className="rounded bg-muted p-4 text-xs overflow-x-auto">
                {safeJsonStringify(session.requestBody, 2)}
              </pre>
            </div>

            {session.responseBody !== undefined && session.responseBody !== null && (
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-3">Response Body</h3>
                <pre className="rounded bg-muted p-4 text-xs overflow-x-auto">
                  {renderResponseBody(session.responseBody)}
                </pre>
              </div>
            )}

            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-3">Container Logs</h3>
              <div className="h-96">
                <LogsViewer containerId={session.sessionId} sessionId={session.sessionId} />
              </div>
            </div>
          </>
        )}

        {!error && !session && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
            <svg className="h-12 w-12 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h5.5a2 2 0 002-2V9a2 2 0 00-2-2z" />
            </svg>
            <h3 className="font-semibold mb-2">Session not found</h3>
            <p className="text-sm text-muted-foreground">
              The requested session could not be found. It may have been deleted or the ID is incorrect.
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}