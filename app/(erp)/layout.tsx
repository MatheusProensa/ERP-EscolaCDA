import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";

export default async function ErpLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session!.user;

  return (
    <AppShell meId={user.id} role={user.role} name={user.name ?? "Usuário"}>
      {children}
    </AppShell>
  );
}
