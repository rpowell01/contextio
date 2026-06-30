import fs from "node:fs/promises";
import { join } from "node:path";
import { listCaptureFiles, getSessionMetadata, extractSessionId, CAPTURE_DIR, MAX_FILE_SIZE } from "@/lib/sessions/utils";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const files = await listCaptureFiles();

    for (const filename of files) {
      try {
        const filepath = join(CAPTURE_DIR, filename);
        const stats = await fs.stat(filepath);
        if (stats.size > MAX_FILE_SIZE) continue;

        const raw = await fs.readFile(filepath, "utf8");
        const data = JSON.parse(raw) as Record<string, unknown>;

        const sessionId = extractSessionId(filename);
        if (sessionId !== id) continue;

        const session = await getSessionMetadata(filename, data);
        return Response.json(session);
      } catch {
        continue;
      }
    }

    return Response.json({ error: "Session not found" }, { status: 404 });
  } catch (error) {
    console.error("Error in session detail API:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}