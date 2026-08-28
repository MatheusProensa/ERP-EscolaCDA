import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";

export default async function ErpLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session!.user;

  // Nome/foto vêm direto do banco (não do token da sessão) — Role e permissão
  // só valem a partir do próximo login de propósito (token mais leve, menos
  // consulta no meio do caminho), mas nome/foto não têm esse motivo de ser: a
  // própria pessoa espera ver a foto que acabou de trocar sem precisar sair e
  // entrar de novo.
  const atual = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, foto: true } });

  return (
    <AppShell
      meId={user.id}
      role={user.role}
      permissoes={user.permissoes}
      name={atual?.name ?? user.name ?? "Usuário"}
      foto={atual?.foto ?? user.image}
    >
      {children}
    </AppShell>
  );
}
