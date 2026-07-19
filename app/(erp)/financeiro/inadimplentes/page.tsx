import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { TabelaInadimplentes, type Inadimplente } from "@/components/modules/dashboard/TabelaInadimplentes";
import { diasEmAtraso } from "@/lib/utils";

export default async function InadimplentesPage() {
  const mensalidadesAtrasadas = await prisma.mensalidade.findMany({
    where: { situacao: "ATRASADA" },
    include: { matricula: { include: { aluno: true, turma: true } } },
    orderBy: { vencimento: "asc" },
  });

  const porAluno = new Map<string, Inadimplente>();
  for (const m of mensalidadesAtrasadas) {
    const alunoId = m.matricula.alunoId;
    const existente = porAluno.get(alunoId);
    const atraso = diasEmAtraso(m.vencimento);
    if (existente) {
      existente.valor += m.valor;
      existente.diasAtraso = Math.max(existente.diasAtraso, atraso);
    } else {
      porAluno.set(alunoId, {
        alunoId,
        nome: m.matricula.aluno.nome,
        turma: m.matricula.turma.nome,
        valor: m.valor,
        diasAtraso: atraso,
      });
    }
  }
  const inadimplentes = Array.from(porAluno.values()).sort((a, b) => b.diasAtraso - a.diasAtraso);

  return (
    <div>
      <PageHeader
        title="Inadimplentes"
        subtitle={`${inadimplentes.length} aluno(s) com mensalidade em atraso`}
        breadcrumb={[{ label: "Financeiro", href: "/financeiro" }, { label: "Inadimplentes" }]}
      />
      <TabelaInadimplentes dados={inadimplentes} linkVerTodos={false} />
    </div>
  );
}
