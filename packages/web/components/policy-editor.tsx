"use client";

import { useState, useEffect, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { RedactionPolicy } from "@/types/api";
import { policySchema } from "@/lib/schema";

const POLICY_FILE_PATH = "/api/policy";

const defaultPolicy: RedactionPolicy = {
  extends: "secrets",
};

interface PolicyEditorProps {
  className?: string;
}

export function PolicyEditor({ className }: PolicyEditorProps) {
  const [policy, setPolicy] = useState<RedactionPolicy>(defaultPolicy);
  const [editorContent, setEditorContent] = useState<string>(() => JSON.stringify(defaultPolicy, null, 2));
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPolicy = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(POLICY_FILE_PATH);
      if (response.ok) {
        const content = await response.json();
        // Validate API response before setting state
        const result = policySchema.safeParse(content);
        if (result.success) {
          setPolicy(result.data);
          setEditorContent(JSON.stringify(result.data, null, 2));
        } else {
          setPolicy(defaultPolicy);
          setEditorContent(JSON.stringify(defaultPolicy, null, 2));
        }
      } else {
        setPolicy(defaultPolicy);
        setEditorContent(JSON.stringify(defaultPolicy, null, 2));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load policy");
      setPolicy(defaultPolicy);
      setEditorContent(JSON.stringify(defaultPolicy, null, 2));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolicy();
  }, [loadPolicy]);

  const savePolicy = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(POLICY_FILE_PATH, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(policy, null, 2),
      });
      if (!response.ok) {
        throw new Error(`Failed to save policy: ${response.statusText}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save policy");
    } finally {
      setIsSaving(false);
    }
  }, [policy]);

  const validatePolicy = useCallback((content: string): { valid: boolean; data?: RedactionPolicy } => {
    try {
      const parsed = JSON.parse(content);

      const result = policySchema.safeParse(parsed);
      if (!result.success) {
        const errors = result.error.errors.map((detail) => {
          const path = detail.path.length > 0 ? detail.path.join(".") : "root";
          return `${path}: ${detail.message}`;
        });
        setValidationErrors(errors);
        return { valid: false };
      }

      setValidationErrors([]);
      return { valid: true, data: result.data };
    } catch (e) {
      setValidationErrors([`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`]);
      return { valid: false };
    }
  }, []);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value === undefined) return;
    setEditorContent(value);
    const { valid, data } = validatePolicy(value);
    if (valid && data) {
      setPolicy(data);
    }
  }, [validatePolicy]);

  const handleEditorDidMount = useCallback(() => {
    // Editor mounted - can be used for additional setup if needed
  }, []);

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading policy...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Redaction Policy</h2>
          <p className="text-muted-foreground">
            Configure PII and secret redaction rules for the proxy
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={savePolicy}
            disabled={isSaving || validationErrors.length > 0}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-4">
          <h4 className="font-semibold text-destructive mb-2">Validation Errors</h4>
          <ul className="text-sm text-destructive">
            {validationErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Editor
          height="500px"
          defaultLanguage="json"
          value={editorContent}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            formatOnPaste: true,
            formatOnType: true,
            minimap: { enabled: false },
            wordWrap: "on",
          }}
        />
      </div>
    </div>
  );
}