// Environment Variables Panel Component
// Displays container environment variables with search, filter, and export capabilities

"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { RefreshCw, Download, Search } from "lucide-react";
import { apiClient } from "@/lib/api";
import type { ContainerEnvVar } from "@/types/api";

interface EnvironmentVariablesPanelProps {
  containerId: string;
}

const ITEMS_PER_PAGE = 20;
const DEBOUNCE_DELAY = 300;

export function EnvironmentVariablesPanel({ containerId }: EnvironmentVariablesPanelProps) {
  const [envVars, setEnvVars] = useState<ContainerEnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchEnvVars = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getContainerEnvVars(containerId);
      setEnvVars(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch environment variables");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvVars();
    const interval = setInterval(fetchEnvVars, 30000);
    return () => clearInterval(interval);
  }, [containerId]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const sources = useMemo(() => {
    const allSources = new Set<string>();
    envVars.forEach((v) => v.source && allSources.add(v.source));
    return ["all", ...Array.from(allSources)];
  }, [envVars]);

  const filteredEnvVars = useMemo(() => {
    return envVars.filter((v) => {
      const matchesSearch =
        v.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.value.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSource = filterSource === "all" || v.source === filterSource;
      return matchesSearch && matchesSource;
    });
  }, [envVars, searchTerm, filterSource]);

  const paginatedEnvVars = filteredEnvVars.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Silently fail
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border p-4">
        <h3 className="font-semibold mb-3">Container Environment Variables</h3>
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border p-4">
        <h3 className="font-semibold mb-3">Container Environment Variables</h3>
        <div className="text-center py-8 text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Container Environment Variables</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchEnvVars}
            className="inline-flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-muted"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search variables..."
            value={searchTerm}
            onChange={(e) => {
              const value = e.target.value;
              // Clear existing timeout
              if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
              }
              // Set new timeout
              debounceTimeoutRef.current = setTimeout(() => {
                setSearchTerm(value);
                setCurrentPage(1);
              }, DEBOUNCE_DELAY);
            }}
            className="pl-8 pr-3 py-2 text-sm border rounded-md w-full"
          />
        </div>
        <select
          value={filterSource}
          onChange={(e) => {
            setFilterSource(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 text-sm border rounded-md"
        >
          {sources.map((source) => (
            <option key={source} value={source}>
              {source === "all" ? "All Sources" : source}
            </option>
          ))}
        </select>
      </div>

      <div className="text-sm text-muted-foreground mb-2">
        Showing {paginatedEnvVars.length} of {filteredEnvVars.length} variables
      </div>

      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Key</th>
              <th className="text-left py-2 font-medium">Value</th>
              <th className="text-left py-2 font-medium">Source</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {paginatedEnvVars.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-muted-foreground">
                  No environment variables found
                </td>
              </tr>
            ) : (
              paginatedEnvVars.map((envVar) => (
                <tr key={envVar.key} className="border-b">
                  <td className="py-2 font-mono text-sm">{envVar.key}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm max-w-[200px] truncate">
                        {envVar.value}
                      </code>
                      <button
                        onClick={() => copyToClipboard(envVar.value)}
                        className="opacity-50 hover:opacity-100"
                        title="Copy value"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td className="py-2 text-muted-foreground">
                    {envVar.source || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
