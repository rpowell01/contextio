"use client";

import { MainLayout } from "@/components/main-layout";
import { EnvironmentVariablesPanel } from "@/components/environment-variables-panel";
import { useState } from "react";

export default function EnvVarsPage() {
  const [containerId, setContainerId] = useState("demo-container");

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Environment Variables</h1>
          <p className="text-muted-foreground">
            View environment variables for containers
          </p>
        </div>
        
        <div className="flex items-end gap-4">
          <div>
            <label htmlFor="containerId" className="block text-sm font-medium mb-1">
              Container ID
            </label>
            <input
              id="containerId"
              type="text"
              placeholder="Enter container ID..."
              value={containerId}
              onChange={(e) => setContainerId(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[200px]"
            />
          </div>
        </div>

        <EnvironmentVariablesPanel containerId={containerId} />
      </div>
    </MainLayout>
  );
}