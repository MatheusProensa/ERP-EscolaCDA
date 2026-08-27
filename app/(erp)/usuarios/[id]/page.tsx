import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { PerfilUsuarioClient } from "@/components/modules/usuarios/PerfilUsuarioClient";

export default async function PerfilUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const usuario = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, createdAt: true, pedidoResetSenhaEm: true },
  });
  if (!usuario) notFound();

  const podeVerAtividade = session?.user.role === "ADMIN";
  const atividades = podeVerAtividade
    ? await prisma.logAtividade.findMany({
        where: { usuario: usuario.name },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : [];

  return (
    <div>
      <PageHeader
        title={usuario.name}
        breadcrumb={[{ label: "Usuários", href: "/usuarios" }, { label: usuario.name }]}
      />
      <PerfilUsuarioClient
        usuario={usuario}
        souEu={usuario.id === session?.user.id}
        podeVerAtividade={podeVerAtividade}
        atividades={atividades}
      />
    </div>
  );
}
