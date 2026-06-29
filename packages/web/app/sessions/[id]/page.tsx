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
  const session = await getSession(id);

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
            Session: {session.sessionId}
          </h1>
        </div>

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
      </div>
    </MainLayout>
  );
}