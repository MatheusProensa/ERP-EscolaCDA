import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { PerfilUsuarioClient } from "@/components/modules/usuarios/PerfilUsuarioClient";
import { PermissoesUsuarioSecao } from "@/components/modules/usuarios/PermissoesUsuarioSecao";

export default async function PerfilUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const usuario = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, foto: true, createdAt: true, pedidoResetSenhaEm: true },
  });
  if (!usuario) notFound();

  const podeVerAtividade = session?.user.role === "ADMIN";
  const [atividades, permissoesSalvas] = await Promise.all([
    podeVerAtividade
      ? prisma.logAtividade.findMany({ where: { usuario: usuario.name }, orderBy: { createdAt: "desc" }, take: 10 })
      : Promise.resolve([]),
    prisma.permissaoUsuario.findMany({ where: { userId: id } }),
  ]);
  const permissoes = Object.fromEntries(permissoesSalvas.map((p) => [p.modulo, p.nivel]));

  return (
    <div>
      <PageHeader
        title={usuario.name}
        breadcrumb={[{ label: "Usuários", href: "/usuarios" }, { label: usuario.name }]}
      />
      <div className="flex flex-col gap-5">
        <PerfilUsuarioClient
          usuario={usuario}
          souEu={usuario.id === session?.user.id}
          podeVerAtividade={podeVerAtividade}
          atividades={atividades}
        />
        <PermissoesUsuarioSecao
          usuarioId={usuario.id}
          usuarioNome={usuario.name}
          souEu={usuario.id === session?.user.id}
          permissoesSalvas={permissoes}
        />
      </div>
    </div>
  );
}
