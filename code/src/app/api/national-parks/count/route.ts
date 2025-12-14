import { prisma } from "@root/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const total = await prisma.nationalPark.count();
    return new Response(
      JSON.stringify({ total }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Count national parks error:", error);
    return new Response(
      JSON.stringify({ error: "Unable to fetch national park count." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
