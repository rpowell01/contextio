import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatBytes } from "@/lib/utils";
import type { TrafficMetric } from "@/types/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface TrafficChartProps {
  data: TrafficMetric[];
}

export function TrafficChart({ data }: TrafficChartProps) {
  const chartData = data.map((item) => ({
    timestamp: new Date(item.timestamp).toLocaleDateString(),
    requestBytes: item.requestBytes,
    responseBytes: item.responseBytes,
    formattedRequest: formatBytes(item.requestBytes),
    formattedResponse: formatBytes(item.responseBytes),
  }));

  return (
    <ChartContainer config={{ request: { color: "#3b82f6" }, response: { color: "#10b981" } }}>
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