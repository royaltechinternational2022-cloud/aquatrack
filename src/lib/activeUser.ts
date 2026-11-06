import { prisma } from "@/lib/db";

/**
 * Session cookies live for 12 hours, so a removed or disabled employee can
 * still hold a valid one. Routes that write records under the session's user
 * check this first.
 */
export async function isActiveUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
  return user?.status === "ACTIVE";
}
