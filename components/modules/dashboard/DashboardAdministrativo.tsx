import { Suspense } from "react";
import { UserCog, TriangleAlert, KeyRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { Card } from "@/components/ui/Card";
import { StatusEstoquePill } from "@/components/modules/estoque/EstoqueVisuais";
import { CalendarioWidget } from "@/components/modules/dashboard/CalendarioWidget";
import { MuralWidget } from "@/components/modules/dashboard/MuralWidget";
import { WidgetFallback } from "@/components/modules/dashboard/WidgetFallback";
import { statusEstoque } from "@/lib/estoqueStatus";

export async function DashboardAdministrativo() {
  const [funcionariosAtivos, itens, chavesEmprestadas] = await Promise.all([
    prisma.funcionario.count({ where: { ativo: true } }),
    prisma.itemEstoque.findMany({ orderBy: { nome: "asc" } }),
    prisma.emprestimoChave.count({ where: { devolucao: null } }),
  ]);

  const criticos = itens
    .filter((i) => statusEstoque(i.quantidade, i.minimo) !== "ok")
    .sort((a, b) => a.quantidade / (a.minimo || 1) - b.quantidade / (b.minimo || 1));

  return (
    <div>
      <PageHeader title="Dashboard Administrativo" subtitle="Funcionários, estoque e chaves" />

      <div className="mb-5">
        <Suspense fallback={<WidgetFallback className="h-40" />}>
          <MuralWidget />
        </Suspense>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard icon={UserCog} iconColor="#1A6FD8" value={funcionariosAtivos} label="Funcionários ativos" />
        <MetricCard
          icon={TriangleAlert}
          iconColor="#DC2626"
          value={criticos.length}
          label="Itens críticos no estoque"
          badge={criticos.length > 0 ? "Atenção" : "Em dia"}
          badgeVariant={criticos.length > 0 ? "red" : "green"}
        />
        <MetricCard icon={KeyRound} iconColor="#D97706" value={chavesEmprestadas} label="Chaves emprestadas" subtext="Ainda não devolvidas" />
      </div>

      <Card title="Estoque baixo">
        <Table>
          <TableHead>
            <Th>Item</Th>
            <Th className="text-right">Atual</Th>
            <Th>Situação</Th>
          </TableHead>
          <TableBody>
            {criticos.length === 0 && <TableEmpty colSpan={3}>Nenhum item abaixo do mínimo 🎉</TableEmpty>}
            {criticos.slice(0, 8).map((item) => (
              <Tr key={item.id}>
                <Td className="font-medium">{item.nome}</Td>
                <Td className="text-right">
                  {item.quantidade} {item.unidade}
                </Td>
                <Td>
                  <StatusEstoquePill status={statusEstoque(item.quantidade, item.minimo)} />
                </Td>
              </Tr>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="mt-5">
        <Suspense fallback={<WidgetFallback className="h-80" />}>
          <CalendarioWidget />
        </Suspense>
      </div>
    </div>
  );
}
