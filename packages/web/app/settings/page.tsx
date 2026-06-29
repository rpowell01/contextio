"use client";

import { MainLayout } from "@/components/main-layout";
import { PolicyEditor } from "@/components/policy-editor";
import { useState } from "react";

interface Settings {
  logDir: string;
  maxSessions: number;
  redactPreset: "secrets" | "pii" | "strict";
  redactReversible: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    logDir: "./captures",
    maxSessions: 0,
    redactPreset: "pii",
    redactReversible: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement settings save
    console.log("Settings saved:", settings);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure ContextIO proxy settings
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg border p-6">
            <h3 className="font-semibold mb-4">Logging</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Capture Directory
                </label>
                <input
                  type="text"
                  value={settings.logDir}
                  onChange={(e) => setSettings({ ...settings, logDir: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="./captures"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Max Sessions (0 = unlimited)
                </label>
                <input
                  type="number"
                  value={settings.maxSessions}
                  onChange={(e) => setSettings({ ...settings, maxSessions: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-md"
                  min="0"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-6">
            <h3 className="font-semibold mb-4">Redaction</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Preset
                </label>
                <select
                  value={settings.redactPreset}
                  onChange={(e) => setSettings({ ...settings, redactPreset: e.target.value as "secrets" | "pii" | "strict" })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="secrets">secrets - API keys and tokens only</option>
                  <option value="pii">pii - Email, SSN, credit cards, phone numbers</option>
                  <option value="strict">strict - PII + IP addresses, dates of birth</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="redactReversible"
                  checked={settings.redactReversible}
                  onChange={(e) => setSettings({ ...settings, redactReversible: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="redactReversible" className="text-sm">
                  Reversible redaction (restore originals in responses)
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-6">
            <h3 className="font-semibold mb-4">Redaction Policy Editor</h3>
            <PolicyEditor />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
          >
            Save Settings
          </button>
        </form>
      </div>
    </MainLayout>
  );
}