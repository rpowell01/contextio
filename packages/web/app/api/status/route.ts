import type { ProxyStatus } from "@/types/api";

export async function GET() {
  try {
    // In a real implementation, this would check the actual proxy process
    // For now, return a mock status indicating the proxy is running
    return Response.json({
      running: true,
      port: 4040,
      sessions: 0,
      uptime: "0s",
    } satisfies ProxyStatus);
  } catch (error) {
    console.error("Error in status API:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}