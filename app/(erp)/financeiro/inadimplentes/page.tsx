import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExportButtons } from "@/components/ui/ExportButtons";
import { TabelaInadimplentes } from "@/components/modules/dashboard/TabelaInadimplentes";
import { agruparInadimplentes, whereAtrasadas } from "@/lib/inadimplencia";

export default async function InadimplentesPage() {
  const mensalidadesAtrasadas = await prisma.mensalidade.findMany({
    where: whereAtrasadas(),
    include: { pagamentos: true, matricula: { include: { aluno: true, turma: true } } },
    orderBy: { vencimento: "asc" },
  });

  const inadimplentes = agruparInadimplentes(mensalidadesAtrasadas);

  return (
    <div>
      <PageHeader
        title="Inadimplentes"
        subtitle={`${inadimplentes.length} aluno(s) com mensalidade em atraso`}
        breadcrumb={[{ label: "Financeiro", href: "/financeiro" }, { label: "Inadimplentes" }]}
        action={<ExportButtons href="/api/relatorios/inadimplentes" />}
      />
      <TabelaInadimplentes dados={inadimplentes} linkVerTodos={false} />
    </div>
  );
}
