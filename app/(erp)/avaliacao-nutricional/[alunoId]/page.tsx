import { notFound } from "next/navigation";
import { TriangleAlert, Scale, Ruler, Activity, CalendarCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Alert } from "@/components/ui/Alert";
import { EscutaAoVivo } from "@/components/ui/EscutaAoVivo";
import { NovaAvaliacaoModal } from "@/components/modules/avaliacao-nutricional/NovaAvaliacaoModal";
import { HistoricoAvaliacoes } from "@/components/modules/avaliacao-nutricional/HistoricoAvaliacoes";
import { ClassificacaoBadge } from "@/components/modules/avaliacao-nutricional/ClassificacaoBadge";
import { podeEditarModulo } from "@/lib/permissoes";
import { avaliarImcPorIdade, formatarIdade } from "@/lib/avaliacaoNutricional";
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

  const ultima = aluno.avaliacoesNutricionais[0];
  const resultadoAtual =
    ultima && aluno.sexo
      ? avaliarImcPorIdade({
          sexo: aluno.sexo,
          dataNascimento: aluno.dataNascimento,
          dataAvaliacao: ultima.data,
          pesoKg: ultima.pesoKg,
          alturaCm: ultima.alturaCm,
        })
      : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <EscutaAoVivo modulo="avaliacao-nutricional" />
      <PageHeader title="Avaliação Nutricional" breadcrumb={[{ label: "Avaliação Nutricional", href: "/avaliacao-nutricional" }, { label: aluno.nome }]} />

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar nome={aluno.nome} foto={aluno.foto} size="lg" />
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-cda-text">{aluno.nome}</h2>
              <p className="mt-0.5 text-sm text-cda-text2">
                {formatarIdade(aluno.dataNascimento, hoje)} · {aluno.avaliacoesNutricionais.length} avaliação(ões) registrada(s)
              </p>
            </div>
          </div>
          {podeEditar && aluno.sexo && (
            <NovaAvaliacaoModal alunoId={aluno.id} hojeISO={hoje.toISOString().slice(0, 10)} />
          )}
        </div>

        {ultima && resultadoAtual && (
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-cda-border pt-4 text-sm sm:grid-cols-4">
            <InfoItem icon={Scale} label="Peso atual" value={`${ultima.pesoKg} kg`} />
            <InfoItem icon={Ruler} label="Altura atual" value={`${ultima.alturaCm} cm`} />
            <InfoItem icon={Activity} label="IMC atual" value={resultadoAtual.imc.toFixed(1)} />
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs text-cda-text3">
                <CalendarCheck className="h-3.5 w-3.5" />
                Diagnóstico
              </span>
              <ClassificacaoBadge classificacao={resultadoAtual.classificacao} />
            </div>
          </div>
        )}
      </Card>

      {!aluno.sexo && (
        <Alert tone="danger" icon={TriangleAlert} title={'Falta o campo "Sexo" no Censo desse aluno'}>
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

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-xs text-cda-text3">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="font-medium text-cda-text">{value}</span>
    </div>
  );
}
