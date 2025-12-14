import { prisma } from "@root/lib/prisma";

export const runtime = "nodejs";

type Params = {
  params: {
    id?: string;
  };
};

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const id = (await params).id?.trim();
    if (!id) {
      return new Response(
        JSON.stringify({ error: "Park id is required." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const existing = await prisma.nationalPark.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!existing) {
      return new Response(
        JSON.stringify({ error: "Park not found." }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    await prisma.nationalPark.delete({ where: { id } });

    return new Response(
      JSON.stringify({ success: true, id, name: existing.name }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Delete national park error:", error);
    return new Response(
      JSON.stringify({ error: "Unable to delete national park." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
