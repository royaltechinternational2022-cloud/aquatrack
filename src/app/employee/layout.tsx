import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBusinessDateKey } from "@/lib/tz";
import EmployeeShell from "./EmployeeShell";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  let needsOpeningReading = false;
  if (session?.role === "EMPLOYEE") {
    const opening = await prisma.meterReading.findUnique({
      where: { businessDate_type: { businessDate: getBusinessDateKey(), type: "OPENING" } },
    });
    needsOpeningReading = !opening;
  }

  return (
    <EmployeeShell name={session?.name ?? ""} needsOpeningReading={needsOpeningReading}>
      {children}
    </EmployeeShell>
  );
}
