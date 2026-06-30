"use client";

import { MainLayout } from "@/components/main-layout";
import { EnvironmentVariablesPanel } from "@/components/environment-variables-panel";
import { useParams } from "next/navigation";

export default function ContainerEnvVarsPage() {
  const params = useParams();
  const containerId = typeof params.id === "string" ? params.id : "demo-container";

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Container Environment Variables</h1>
          <p className="text-muted-foreground">
            View and manage environment variables for container {containerId}
          </p>
        </div>
        <EnvironmentVariablesPanel containerId={containerId} />
      </div>
    </MainLayout>
  );
}