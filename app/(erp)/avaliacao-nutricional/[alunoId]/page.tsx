import { notFound } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Alert } from "@/components/ui/Alert";
import { EscutaAoVivo } from "@/components/ui/EscutaAoVivo";
import { NovaAvaliacaoModal } from "@/components/modules/avaliacao-nutricional/NovaAvaliacaoModal";
import { HistoricoAvaliacoes } from "@/components/modules/avaliacao-nutricional/HistoricoAvaliacoes";
import { podeEditarModulo } from "@/lib/permissoes";
import { formatarIdade } from "@/lib/avaliacaoNutricional";
import { hojeBrasilia } from "@/lib/utils";

export default async function AvaliacaoNutricionalAlunoPage({ params }: { params: Promise<{ alunoId: string }> }) {
  const { alunoId } = await params;
  const session = await auth();
  const podeEditar = podeEditarModulo("/avaliacao-nutricional", session?.user.role ?? "", session?.user.permissoes);
  const hoje = hojeBrasilia();

  const aluno = await prisma.aluno.findUnique({
    where: { id: alunoId },
    select: {
      id: true,
      nome: true,
      foto: true,
      sexo: true,
      dataNascimento: true,
      avaliacoesNutricionais: { orderBy: { data: "desc" } },
    },
  });
  if (!aluno) notFound();

  const avaliacoesParaExibir = aluno.avaliacoesNutricionais.map((a) => ({
    id: a.id,
    data: a.data.toISOString(),
    pesoKg: a.pesoKg,
    alturaCm: a.alturaCm,
    observacoes: a.observacoes,
  }));

  return (
    <div>
      <EscutaAoVivo modulo="avaliacao-nutricional" />
      <PageHeader
        title={aluno.nome}
        breadcrumb={[{ label: "Avaliação Nutricional", href: "/avaliacao-nutricional" }, { label: aluno.nome }]}
        subtitle={`${formatarIdade(aluno.dataNascimento, hoje)} · ${aluno.avaliacoesNutricionais.length} avaliação(ões) registrada(s)`}
        action={podeEditar && aluno.sexo ? <NovaAvaliacaoModal alunoId={aluno.id} hojeISO={hoje.toISOString().slice(0, 10)} /> : undefined}
      />

      <div className="mb-5 flex items-center gap-3">
        <Avatar nome={aluno.nome} foto={aluno.foto} size="lg" />
      </div>

      {!aluno.sexo && (
        <Alert tone="danger" icon={TriangleAlert} title={'Falta o campo "Sexo" no Censo desse aluno'} className="mb-5">
          A classificação de IMC por idade usa curvas diferentes pra menino e menina — sem isso preenchido no cadastro
          (aba Censo), não dá pra calcular. Preencha lá antes de lançar uma avaliação.
        </Alert>
      )}

      {aluno.sexo && (
        <HistoricoAvaliacoes
          avaliacoes={avaliacoesParaExibir}
          sexo={aluno.sexo}
          dataNascimento={aluno.dataNascimento.toISOString()}
          podeEditar={podeEditar}
        />
      )}
    </div>
  );
}
