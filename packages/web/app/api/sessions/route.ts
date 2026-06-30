import fs from "node:fs/promises";
import { join } from "node:path";
import type { Session } from "@/types/api";
import { listCaptureFiles, getSessionMetadata, CAPTURE_DIR, MAX_FILE_SIZE } from "@/lib/sessions/utils";

export async function GET() {
  try {
    const files = await listCaptureFiles();
    const sessions: Session[] = [];

    for (const filename of files) {
      try {
        const filepath = join(CAPTURE_DIR, filename);
        const stats = await fs.stat(filepath);
        if (stats.size > MAX_FILE_SIZE) continue;

        const raw = await fs.readFile(filepath, "utf8");
        const data = JSON.parse(raw) as Record<string, unknown>;

        const session = await getSessionMetadata(filename, data);
        sessions.push(session);
      } catch {
        continue;
      }
    }

    // Sort by timestamp descending (newest first)
    sessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return Response.json(sessions);
  } catch (error) {
    console.error("Error in sessions API:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}