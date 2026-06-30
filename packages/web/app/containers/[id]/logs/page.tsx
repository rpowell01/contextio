"use client";

import { MainLayout } from "@/components/main-layout";
import { LogsViewer } from "@/components/logs-viewer";
import { useParams } from "next/navigation";

export default function ContainerLogsPage() {
  const params = useParams();
  const containerId = typeof params.id === "string" ? params.id : "demo-container";

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Container Logs</h1>
          <p className="text-muted-foreground">
            View logs for container {containerId}
          </p>
        </div>
        <div className="h-[calc(100vh-200px)]">
          <LogsViewer containerId={containerId} />
        </div>
      </div>
    </MainLayout>
  );
}