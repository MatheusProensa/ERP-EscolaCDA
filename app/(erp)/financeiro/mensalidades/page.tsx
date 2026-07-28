import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MensalidadesGerenciar } from "@/components/modules/financeiro/MensalidadesGerenciar";
import { ordenarTurmas } from "@/lib/utils";
import type { SituacaoMensalidade } from "@prisma/client";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default async function MensalidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; situacao?: string; turma?: string; busca?: string }>;
}) {
  const { mes, situacao, turma, busca } = await searchParams;
  const hoje = new Date();

  const anoLetivo = await prisma.anoLetivo.findFirst({ where: { ativo: true } });
  const turmas = ordenarTurmas(await prisma.turma.findMany({ where: { anoLetivoId: anoLetivo?.id } }));

  // "Atrasada" é calculado (vencida e ainda não paga), não um valor gravado — nada no sistema
  // grava ATRASADA em `situacao`, então filtrar literalmente por esse valor nunca traria resultado.
  let situacaoWhere: { situacao?: SituacaoMensalidade; vencimento?: { lt?: Date; gte?: Date } } = {};
  if (situacao === "ATRASADA") {
    situacaoWhere = { situacao: "PENDENTE", vencimento: { lt: hoje } };
  } else if (situacao === "PENDENTE") {
    situacaoWhere = { situacao: "PENDENTE", vencimento: { gte: hoje } };
  } else if (situacao) {
    situacaoWhere = { situacao: situacao as SituacaoMensalidade };
  }

  const mensalidades = await prisma.mensalidade.findMany({
    where: {
      mes: mes ? Number(mes) : undefined,
      ...situacaoWhere,
      matricula: {
        anoLetivoId: anoLetivo?.id,
        turmaId: turma || undefined,
        aluno: busca ? { nome: { contains: busca, mode: "insensitive" } } : undefined,
      },
    },
    include: { pagamentos: { orderBy: { dataPagamento: "desc" } }, matricula: { include: { aluno: true, turma: true } } },
    orderBy: [{ vencimento: "asc" }],
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="Mensalidades"
        subtitle={`${mensalidades.length} mensalidade(s) encontrada(s)`}
        breadcrumb={[{ label: "Financeiro", href: "/financeiro" }, { label: "Mensalidades" }]}
      />

      <Card className="mb-5 p-4">
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <Input name="busca" placeholder="Buscar por aluno..." defaultValue={busca} className="sm:col-span-2" />
          <Select name="mes" defaultValue={mes ?? ""}>
            <option value="">Todos os meses</option>
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </Select>
          <Select name="situacao" defaultValue={situacao ?? ""}>
            <option value="">Todas as situações</option>
            <option value="PAGA">Paga</option>
            <option value="PENDENTE">Pendente</option>
            <option value="ATRASADA">Atrasada</option>
            <option value="CANCELADA">Cancelada</option>
          </Select>
          <Select name="turma" defaultValue={turma ?? ""}>
            <option value="">Todas as turmas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="outline" className="sm:col-span-5 sm:w-fit">
            Filtrar
          </Button>
        </form>
      </Card>

      <Card>
        <MensalidadesGerenciar mensalidades={mensalidades} />
      </Card>
    </div>
  );
}
