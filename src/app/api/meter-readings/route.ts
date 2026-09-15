import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getBusinessDateKey } from "@/lib/tz";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const businessDate = searchParams.get("date") ?? getBusinessDateKey();

  const readings = await prisma.meterReading.findMany({
    where: { businessDate },
    include: { recordedBy: { select: { name: true } } },
  });

  const opening = readings.find((r) => r.type === "OPENING") ?? null;
  const closing = readings.find((r) => r.type === "CLOSING") ?? null;

  return NextResponse.json({ businessDate, opening, closing });
}

const createSchema = z.object({
  type: z.enum(["OPENING", "CLOSING"]),
  reading: z.number().min(0),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid meter reading", details: parsed.error.flatten() }, { status: 400 });
  }

  const businessDate = getBusinessDateKey();

  try {
    const reading = await prisma.meterReading.create({
      data: {
        businessDate,
        type: parsed.data.type,
        reading: parsed.data.reading,
        recordedById: session.sub,
      },
    });
    return NextResponse.json({ reading });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Someone else already recorded today's reading of this type — not an error, just already done.
      const existing = await prisma.meterReading.findUnique({
        where: { businessDate_type: { businessDate, type: parsed.data.type } },
      });
      return NextResponse.json({ reading: existing, alreadyRecorded: true });
    }
    throw err;
  }
}
