import { Download, KeyRound } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { NovoUsuarioModal } from "@/components/modules/usuarios/NovoUsuarioModal";
import { UsuarioCard } from "@/components/modules/usuarios/UsuarioCard";
import { podeEditarModulo } from "@/lib/permissoes";

export default async function UsuariosPage() {
  const session = await auth();
  // Achado real (revisão de set/2026): quem tem "Só visualizar" em Usuários
  // via a grade via ainda o botão de criar usuário novo — sério porque esse
  // setor mexe com acesso ao sistema inteiro, não só dado de um cadastro.
  const podeEditar = podeEditarModulo("/usuarios", session?.user.role ?? "", session?.user.permissoes);
  const usuarios = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, foto: true, createdAt: true, pedidoResetSenhaEm: true },
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
            {podeEditar && <NovoUsuarioModal />}
          </div>
        }
      />

      {pedidosPendentes > 0 && (
        <Alert
          tone="warning"
          icon={KeyRound}
          title={
            pedidosPendentes === 1
              ? "1 pessoa pediu redefinição de senha"
              : `${pedidosPendentes} pessoas pediram redefinição de senha`
          }
          className="mb-5"
        >
          Marcadas abaixo com o ícone de chave.
        </Alert>
      )}

      {usuarios.length === 0 ? (
        <EmptyState title="Nenhum usuário cadastrado." />
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
