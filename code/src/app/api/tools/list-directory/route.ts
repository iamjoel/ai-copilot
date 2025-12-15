import { listDirectoryContents } from "@/lib/tools/list-directory";

export const runtime = "nodejs";

async function handleListDirectory(path?: string) {
  try {
    const result = await listDirectoryContents(path);
    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list directory contents.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  const { path }: { path?: string } = await req.json();
  return handleListDirectory(path);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") ?? undefined;
  return handleListDirectory(path);
}
