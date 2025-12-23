export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    massType: (process.env.MAAS_TYPE || 'OPEN_ROUTER').toLowerCase(),
  });
}
