import { readFileSync, existsSync } from "node:fs";

const UPLOADS_DIR = "data/uploads";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const filepath = `${UPLOADS_DIR}/${filename}`;

  if (!existsSync(filepath)) {
    return new Response(null, { status: 404 });
  }

  const buffer = readFileSync(filepath);
  const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
  const contentType = MIME[ext] || "image/jpeg";

  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
