import { MainLayout } from "@/components/main-layout";
import { formatDateTime } from "@/lib/utils";
import type { Session } from "@/types/api";
import Link from "next/link";

async function getSessions(): Promise<Session[]> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4040";
  const res = await fetch(`${API_URL}/api/sessions`, {
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch sessions: ${res.statusText}`);
  }

  return res.json();
}

export default async function SessionsPage() {
  let sessions: Session[] = [];
  let error: string | null = null;

  try {
    sessions = await getSessions();
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
            <p className="text-muted-foreground">
              Captured API request/response pairs
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
            <p className="text-destructive">Error: {error}</p>
          </div>
        )}

        {!error && sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
            <svg className="h-12 w-12 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h5.5a2 2 0 002-2V9a2 2 0 00-2-2z" />
            </svg>
            <h3 className="font-semibold mb-2">No sessions captured yet</h3>
            <p className="text-sm text-muted-foreground">
              Start the proxy and make some API requests to see sessions here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <Link
                key={session.sessionId}
                href={`/sessions/${session.sessionId}`}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h5.5a2 2 0 002-2V9a2 2 0 00-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">{session.source} → {session.provider}</div>
                    <div className="text-sm text-muted-foreground">
                      Status: {session.responseStatus} • {formatDateTime(session.timestamp)}
                    </div>
                  </div>
                </div>
                <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}