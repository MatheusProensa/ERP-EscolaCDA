import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default async function ErpLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session!.user;

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={user.name ?? "Usuário"} role={user.role} />
        <main className="flex-1 overflow-y-auto bg-cda-bg p-5">{children}</main>
      </div>
    </div>
  );
}
