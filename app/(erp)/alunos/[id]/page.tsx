import { notFound } from "next/navigation";
import { Phone, Mail, FileDown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AlunoCard } from "@/components/modules/alunos/AlunoCard";
import { CensoSecao } from "@/components/modules/alunos/CensoSecao";
import { ContratoSecao } from "@/components/modules/alunos/ContratoSecao";
import { MatriculaAcoes } from "@/components/modules/alunos/MatriculaAcoes";
import { MensalidadeTable } from "@/components/modules/financeiro/MensalidadeTable";
import { formatarTelefone } from "@/lib/utils";

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

  return (
    <div>
      <PageHeader
        title={aluno.nome}
        breadcrumb={[{ label: "Alunos", href: "/alunos" }, { label: aluno.nome }]}
        action={
          <a
            href={`/api/alunos/${aluno.id}/ficha`}
            className="flex items-center gap-1.5 rounded-lg border border-cda-border bg-white px-3 py-1.5 text-xs font-medium text-cda-text hover:bg-cda-bg"
          >
            <FileDown className="h-3.5 w-3.5" />
            Baixar ficha PDF
          </a>
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
                action={<MatriculaAcoes matriculaId={m.id} situacaoAtual={m.situacao} />}
              >
                <MensalidadeTable mensalidades={m.mensalidades} />
              </Card>
            </div>
          ))}
        </div>

        <Card title="Responsáveis" className="h-fit">
          <div className="flex flex-col divide-y divide-cda-border">
            {aluno.responsaveis.length === 0 && (
              <p className="px-5 py-6 text-center text-sm text-cda-text3">
                Nenhum responsável cadastrado.
              </p>
            )}
            {aluno.responsaveis.map((r) => (
              <div key={r.id} className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-cda-text">{r.nome}</span>
                  {r.autorizado && <Badge variant="green">Autorizado a retirar</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-cda-text3">{r.parentesco}</p>
                <div className="mt-2 flex flex-col gap-1 text-sm text-cda-text2">
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {formatarTelefone(r.telefone)}
                  </span>
                  {r.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      {r.email}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
