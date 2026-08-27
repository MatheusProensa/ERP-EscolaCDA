import { Download } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, TableHead, Th, TableBody, TableEmpty } from "@/components/ui/Table";
import { NovoUsuarioModal } from "@/components/modules/usuarios/NovoUsuarioModal";
import { UsuarioLinha } from "@/components/modules/usuarios/UsuarioLinha";

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
        subtitle="Quem tem acesso ao sistema e a qual setor"
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
            {pedidosPendentes === 1 ? "pessoa pediu" : "pessoas pediram"} redefinição de senha — marcadas abaixo.
          </p>
        </div>
      )}

      <Card>
        <Table>
          <TableHead>
            <Th>Usuário</Th>
            <Th>Perfil</Th>
            <Th>Desde</Th>
            <Th> </Th>
          </TableHead>
          <TableBody>
            {usuarios.length === 0 && <TableEmpty colSpan={4}>Nenhum usuário cadastrado.</TableEmpty>}
            {usuarios.map((usuario) => (
              <UsuarioLinha key={usuario.id} usuario={usuario} souEu={usuario.id === session?.user.id} />
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
