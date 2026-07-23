import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { EstoquePainel } from "@/components/modules/estoque/EstoquePainel";
import { NovoItemModal } from "@/components/modules/estoque/NovoItemModal";
import { ordenarTurmas } from "@/lib/utils";

export default async function EstoquePage() {
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  const [itens, movimentacoes, entradasMes, saidasMes, anoLetivo] = await Promise.all([
    prisma.itemEstoque.findMany({ orderBy: { nome: "asc" } }),
    prisma.movimentacaoEstoque.findMany({
      include: { item: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.movimentacaoEstoque.aggregate({
      _sum: { quantidade: true },
      where: { tipo: "ENTRADA", createdAt: { gte: inicioMes } },
    }),
    prisma.movimentacaoEstoque.aggregate({
      _sum: { quantidade: true },
      where: { tipo: "SAIDA", createdAt: { gte: inicioMes } },
    }),
    prisma.anoLetivo.findFirst({ where: { ativo: true } }),
  ]);

  const turmasRaw = await prisma.turma.findMany({
    where: { anoLetivoId: anoLetivo?.id },
    include: {
      matriculas: {
        where: { situacao: "ATIVA" },
        include: { aluno: true, controleMaterial: true },
        orderBy: { aluno: { nome: "asc" } },
      },
    },
  });
  const turmas = ordenarTurmas(turmasRaw);

  return (
    <div>
      <PageHeader
        title="Estoque"
        subtitle="Materiais e suprimentos da escola"
        action={<NovoItemModal />}
      />

      <EstoquePainel
        itens={itens}
        movimentacoes={movimentacoes}
        entradasMes={entradasMes._sum.quantidade ?? 0}
        saidasMes={saidasMes._sum.quantidade ?? 0}
        turmas={turmas}
      />
    </div>
  );
}
