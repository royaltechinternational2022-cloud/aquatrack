import { prisma } from "@/lib/db";

export async function generateTransactionNumber(): Promise<string> {
  const last = await prisma.sale.findFirst({
    orderBy: { createdAt: "desc" },
    select: { transactionNumber: true },
  });
  let next = 1001;
  if (last) {
    const match = last.transactionNumber.match(/(\d+)$/);
    if (match) next = parseInt(match[1], 10) + 1;
  }
  return `WS${next}`;
}
