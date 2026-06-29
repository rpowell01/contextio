import { MainLayout } from "@/components/main-layout";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
            Something went wrong
          </h1>
        </div>

        <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
          <h2 className="text-lg font-semibold text-destructive mb-2">
            Error loading session
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {error.message || "An unexpected error occurred while loading the session."}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => reset()}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90"
            >
              Try again
            </button>
            <Link
              href="/sessions"
              className="px-4 py-2 text-sm font-medium text-foreground bg-secondary rounded-md hover:bg-secondary/80"
            >
              Back to sessions
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}