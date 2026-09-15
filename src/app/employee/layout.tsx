import { getSession } from "@/lib/auth";
import EmployeeShell from "./EmployeeShell";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return <EmployeeShell name={session?.name ?? ""}>{children}</EmployeeShell>;
}
