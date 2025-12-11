import { prisma } from "@root/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  try {


    const created = await prisma.test.create({ data: { name: "TestName" } });

    return new Response(
      JSON.stringify({ id: created.id, name: created.name }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("test-add-park error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to insert mock park." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
