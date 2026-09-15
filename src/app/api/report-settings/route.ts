import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

async function ensureSettings() {
  let settings = await prisma.reportSettings.findUnique({ where: { id: "singleton" } });
  if (!settings) {
    settings = await prisma.reportSettings.create({ data: { id: "singleton" } });
  }
  return settings;
}

export async function GET() {
  const settings = await ensureSettings();
  return NextResponse.json({
    settings: { ...settings, recipientEmails: JSON.parse(settings.recipientEmails) as string[] },
  });
}

const schema = z.object({
  recipientEmails: z.array(z.string().email()).min(0),
  dailyEnabled: z.boolean(),
  dailyTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  weeklyEnabled: z.boolean(),
  weeklyDay: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
  monthlyEnabled: z.boolean(),
});

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid report settings", details: parsed.error.flatten() }, { status: 400 });
  }

  await ensureSettings();
  const settings = await prisma.reportSettings.update({
    where: { id: "singleton" },
    data: {
      ...parsed.data,
      recipientEmails: JSON.stringify(parsed.data.recipientEmails),
    },
  });

  return NextResponse.json({
    settings: { ...settings, recipientEmails: JSON.parse(settings.recipientEmails) as string[] },
  });
}
