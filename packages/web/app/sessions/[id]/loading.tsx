import { MainLayout } from "@/components/main-layout";

export default function Loading() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <div className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to sessions
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-2">
            Loading session...
          </h1>
        </div>

        <div className="space-y-4">
          {/* Request/Response cards skeleton */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-3">
                <span className="animate-pulse bg-muted rounded h-5 w-32"></span>
              </h3>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-5/6"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-4/6"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-3/6"></div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-3">
                <span className="animate-pulse bg-muted rounded h-5 w-32"></span>
              </h3>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-5/6"></div>
              </div>
            </div>
          </div>

          {/* Request Body skeleton */}
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold mb-3">
              <span className="animate-pulse bg-muted rounded h-5 w-40"></span>
            </h3>
            <div className="rounded bg-muted p-4 text-xs">
              <div className="h-4 bg-muted rounded animate-pulse mb-2"></div>
              <div className="h-4 bg-muted rounded animate-pulse w-5/6"></div>
            </div>
          </div>

          {/* Container Logs skeleton */}
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold mb-3">
              <span className="animate-pulse bg-muted rounded h-5 w-40"></span>
            </h3>
            <div className="h-96 bg-muted rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}