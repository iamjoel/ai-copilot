import prisma from "../prisma";
import type { NationalPark, Prisma } from "@root/generated/prisma";

export async function createNationalPark(
  data: Prisma.NationalParkCreateInput,
) {
  return prisma.nationalPark.create({ data });
}

export async function updateNationalPark(
  id: string,
  data: Prisma.NationalParkUpdateInput,
): Promise<NationalPark> {
  return prisma.nationalPark.update({
    where: { id },
    data,
  });
}

export async function deleteNationalPark(id: string): Promise<NationalPark> {
  return prisma.nationalPark.delete({
    where: { id },
  });
}

export async function getNationalParkByName(name: string): Promise<NationalPark | null> {
  return prisma.nationalPark.findFirst({
    where: { name },
  });
}

export async function searchNationalParks({
  search,
  skip = 0,
  take = 20,
}: {
  search?: string;
  skip?: number;
  take?: number;
}): Promise<{ items: NationalPark[]; total: number }> {
  const where: Prisma.NationalParkWhereInput | undefined = search
    ? {
      OR: [
        { wikiUrl: { contains: search, mode: "insensitive" } },
        { officialWebsite: { contains: search, mode: "insensitive" } },
      ],
    }
    : undefined;

  const [items, total] = await prisma.$transaction([
    prisma.nationalPark.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.nationalPark.count({ where }),
  ]);

  return { items, total };
}
