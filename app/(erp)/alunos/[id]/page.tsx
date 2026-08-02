import { notFound } from "next/navigation";
import { FileDown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlunoCard } from "@/components/modules/alunos/AlunoCard";
import { CensoSecao } from "@/components/modules/alunos/CensoSecao";
import { ContratoSecao } from "@/components/modules/alunos/ContratoSecao";
import { MatriculaAcoes } from "@/components/modules/alunos/MatriculaAcoes";
import { ResponsaveisSecao } from "@/components/modules/alunos/ResponsaveisSecao";
import { NovaMatriculaModal } from "@/components/modules/alunos/NovaMatriculaModal";
import { MensalidadeTable } from "@/components/modules/financeiro/MensalidadeTable";
import { NovaCobrancaModal } from "@/components/modules/financeiro/NovaCobrancaModal";
import { ordenarTurmas } from "@/lib/utils";

export default async function AlunoPerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const aluno = await prisma.aluno.findUnique({
    where: { id },
    include: {
      responsaveis: true,
      matriculas: {
        include: {
          turma: true,
          contrato: true,
          mensalidades: {
            include: { pagamentos: { orderBy: { dataPagamento: "desc" } } },
            orderBy: { mes: "asc" },
          },
        },
        orderBy: { dataMatricula: "desc" },
      },
    },
  });

  if (!aluno) notFound();

  const matriculasAtivas = aluno.matriculas.filter((m) => m.situacao === "ATIVA");
  const matriculaPrincipal = matriculasAtivas[0] ?? aluno.matriculas[0];

  const anoLetivo = await prisma.anoLetivo.findFirst({ where: { ativo: true } });
  const turmasBrutas = anoLetivo
    ? ordenarTurmas(await prisma.turma.findMany({ where: { anoLetivoId: anoLetivo.id } }))
    : [];
  const turmasDisponiveis = await Promise.all(
    turmasBrutas.map(async (t) => ({
      ...t,
      matriculados: await prisma.matricula.count({ where: { turmaId: t.id, situacao: "ATIVA" } }),
    }))
  );
  const turmaIdsDoAluno = new Set(matriculasAtivas.map((m) => m.turmaId));

  return (
    <div>
      <PageHeader
        title={aluno.nome}
        breadcrumb={[{ label: "Alunos", href: "/alunos" }, { label: aluno.nome }]}
        action={
          <div className="flex items-center gap-2">
            <NovaMatriculaModal
              alunoId={aluno.id}
              turmas={turmasDisponiveis.filter((t) => !turmaIdsDoAluno.has(t.id))}
            />
            <Button href={`/api/alunos/${aluno.id}/ficha`} variant="outline">
              <FileDown className="h-4 w-4" />
              Baixar ficha PDF
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <AlunoCard
            aluno={aluno}
            turmas={matriculasAtivas.map((m) => m.turma.nome)}
            situacao={matriculaPrincipal?.situacao ?? "ATIVA"}
          />

          <CensoSecao aluno={aluno} />

          {aluno.matriculas.map((m) => (
            <div key={m.id} className="flex flex-col gap-5">
              <ContratoSecao matriculaId={m.id} turmaNome={m.turma.nome} contrato={m.contrato} />
              <Card
                title={`Mensalidades — ${m.turma.nome}`}
                action={
                  <div className="flex items-center gap-2">
                    <NovaCobrancaModal matriculaId={m.id} />
                    <MatriculaAcoes
                      matriculaId={m.id}
                      situacaoAtual={m.situacao}
                      turmasDisponiveis={turmasDisponiveis.filter((t) => t.id !== m.turmaId)}
                    />
                  </div>
                }
              >
                <MensalidadeTable mensalidades={m.mensalidades} podeEditar />
              </Card>
            </div>
          ))}
        </div>

        <ResponsaveisSecao alunoId={aluno.id} responsaveis={aluno.responsaveis} />
      </div>
    </div>
  );
}
