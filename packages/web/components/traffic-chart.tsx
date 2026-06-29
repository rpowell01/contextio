import { useState } from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatBytes } from "@/lib/utils";
import type { TrafficMetric } from "@/types/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Copy } from "lucide-react";

interface TrafficChartProps {
  data: TrafficMetric[];
}

export function TrafficChart({ data }: TrafficChartProps) {
  const [copied, setCopied] = useState(false);

  const chartData = data.map((item) => ({
    timestamp: new Date(item.timestamp).toLocaleDateString(),
    requestBytes: item.requestBytes,
    responseBytes: item.responseBytes,
    formattedRequest: formatBytes(item.requestBytes),
    formattedResponse: formatBytes(item.responseBytes),
  }));

  const copyToClipboard = async () => {
    try {
      const dataToCopy = chartData.map(({ formattedRequest, formattedResponse, ...rest }) => rest);
      await navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail
    }
  };

  return (
    <ChartContainer config={{ request: { color: "#3b82f6" }, response: { color: "#10b981" } }}>
      <div className="flex justify-end mb-2">
        <button
          onClick={copyToClipboard}
          className="inline-flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-muted"
          aria-label={copied ? "Chart data copied to clipboard" : "Copy chart data to clipboard"}
          title={copied ? "Chart data copied to clipboard" : "Copy chart data to clipboard"}
        >
          <Copy className="h-4 w-4" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="requestBytes" name="Request Bytes" fill="#3b82f6" />
          <Bar dataKey="responseBytes" name="Response Bytes" fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}