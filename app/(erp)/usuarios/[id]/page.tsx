import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { PerfilUsuarioClient } from "@/components/modules/usuarios/PerfilUsuarioClient";
import { PermissoesUsuarioSecao } from "@/components/modules/usuarios/PermissoesUsuarioSecao";
import { VinculosPedagogicosSecao } from "@/components/modules/usuarios/VinculosPedagogicosSecao";
import { AtividadeUsuarioSecao } from "@/components/modules/usuarios/AtividadeUsuarioSecao";
import { podeEditarModulo } from "@/lib/permissoes";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { EscutaAoVivo } from "@/components/ui/EscutaAoVivo";

export default async function PerfilUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const podeEditar = podeEditarModulo("/usuarios", session?.user.role ?? "", session?.user.permissoes);

  const usuario = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, foto: true, createdAt: true, pedidoResetSenhaEm: true },
  });
  if (!usuario) notFound();

  const podeVerAtividade = session?.user.role === "ADMIN";
  // Vínculo com turma só faz sentido pra quem é do Pedagógico — pra outros
  // perfis (Financeiro, Administrativo...) a seção nem aparece.
  const ehPedagogico = usuario.role === "PEDAGOGICO";
  const anoLetivo = ehPedagogico ? await getAnoLetivoAtivo() : null;
  const [atividades, permissoesSalvas, turmas, vinculosSalvos] = await Promise.all([
    podeVerAtividade
      ? prisma.logAtividade.findMany({ where: { usuario: usuario.name }, orderBy: { createdAt: "desc" }, take: 10 })
      : Promise.resolve([]),
    prisma.permissaoUsuario.findMany({ where: { userId: id } }),
    anoLetivo
      ? prisma.turma.findMany({ where: { anoLetivoId: anoLetivo.id }, orderBy: { nome: "asc" }, select: { id: true, nome: true, turno: true } })
      : Promise.resolve([]),
    ehPedagogico
      ? prisma.vinculoPedagogico.findMany({ where: { userId: id }, select: { turmaId: true, papel: true, materia: true } })
      : Promise.resolve([]),
  ]);
  const permissoes = Object.fromEntries(permissoesSalvas.map((p) => [p.modulo, p.nivel]));

  return (
    <div>
      <EscutaAoVivo modulo="usuarios" />
      <PageHeader
        title={usuario.name}
        breadcrumb={[{ label: "Usuários", href: "/usuarios" }, { label: usuario.name }]}
      />
      <div className="flex flex-col gap-5">
        <PerfilUsuarioClient usuario={usuario} souEu={usuario.id === session?.user.id} podeEditar={podeEditar} />
        <PermissoesUsuarioSecao
          usuarioId={usuario.id}
          usuarioNome={usuario.name}
          souEu={usuario.id === session?.user.id}
          role={usuario.role}
          permissoesSalvas={permissoes}
          podeEditar={podeEditar}
        />
        {ehPedagogico && (
          <VinculosPedagogicosSecao
            usuarioId={usuario.id}
            usuarioNome={usuario.name}
            turmas={turmas}
            vinculosSalvos={vinculosSalvos}
            podeEditar={podeEditar}
          />
        )}
        {podeVerAtividade && <AtividadeUsuarioSecao atividades={atividades} />}
      </div>
    </div>
  );
}
