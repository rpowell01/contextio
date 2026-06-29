import { MainLayout } from "@/components/main-layout";

export default function Loading() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold tracking-tight h-8 bg-muted rounded animate-pulse mb-2"></div>
            <div className="text-sm text-muted-foreground h-4 bg-muted rounded animate-pulse w-64"></div>
          </div>
        </div>

        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-muted p-3">
                  <div className="h-5 w-5 bg-muted-foreground/20 rounded"></div>
                </div>
                <div>
                  <div className="h-4 bg-muted rounded animate-pulse mb-1 w-48"></div>
                  <div className="h-3 bg-muted rounded animate-pulse w-32"></div>
                </div>
              </div>
              <div className="h-5 w-5 bg-muted rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}