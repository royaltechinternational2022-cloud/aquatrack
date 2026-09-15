import { getSession } from "@/lib/auth";
import AdminShell from "./AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return <AdminShell name={session?.name ?? ""}>{children}</AdminShell>;
}
