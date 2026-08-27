import { Download } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { NovoUsuarioModal } from "@/components/modules/usuarios/NovoUsuarioModal";
import { UsuarioCard } from "@/components/modules/usuarios/UsuarioCard";

export default async function UsuariosPage() {
  const session = await auth();
  const usuarios = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true, pedidoResetSenhaEm: true },
  });
  const pedidosPendentes = usuarios.filter((u) => u.pedidoResetSenhaEm).length;

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle="Quem tem acesso ao sistema — clique numa pessoa pra ver e editar o perfil"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button href="/api/backup" variant="outline">
              <Download className="h-4 w-4" />
              Baixar backup
            </Button>
            <NovoUsuarioModal />
          </div>
        }
      />

      {pedidosPendentes > 0 && (
        <div className="mb-5 flex items-center gap-2 rounded-[10px] border border-cda-amber/30 bg-cda-amber/5 p-4">
          <Badge variant="amber">{pedidosPendentes}</Badge>
          <p className="text-sm text-cda-text2">
            {pedidosPendentes === 1 ? "pessoa pediu" : "pessoas pediram"} redefinição de senha — marcadas abaixo com{" "}
            <span className="inline-flex items-center align-middle text-cda-amber">🔑</span>.
          </p>
        </div>
      )}

      {usuarios.length === 0 ? (
        <p className="py-10 text-center text-sm text-cda-text3">Nenhum usuário cadastrado.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {usuarios.map((usuario) => (
            <UsuarioCard key={usuario.id} usuario={usuario} souEu={usuario.id === session?.user.id} />
          ))}
        </div>
      )}
    </div>
  );
}
