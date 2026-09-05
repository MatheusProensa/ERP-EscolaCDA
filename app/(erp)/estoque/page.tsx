import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { EstoquePainel } from "@/components/modules/estoque/EstoquePainel";
import { NovoItemModal } from "@/components/modules/estoque/NovoItemModal";
import { hojeBrasilia } from "@/lib/utils";

export default async function EstoquePage() {
  // hojeBrasilia() (não new Date()): agora.getMonth() num servidor que roda em
  // UTC (Vercel) já é UTC por baixo dos panos — "entradas/saídas deste mês"
  // virava do mês errado entre 21h e meia-noite em Brasília.
  const hoje = hojeBrasilia();
  const inicioMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));

  const [itens, movimentacoes, entradasMes, saidasMes] = await Promise.all([
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
  ]);

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
      />
    </div>
  );
}
