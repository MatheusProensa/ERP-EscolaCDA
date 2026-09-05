import { Suspense } from "react";
import { UserCog, TriangleAlert, CircleCheck, KeyRound, Megaphone, Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { Card } from "@/components/ui/Card";
import { StatusEstoquePill } from "@/components/modules/estoque/EstoqueVisuais";
import { AtalhosRapidos, type Atalho } from "@/components/modules/dashboard/AtalhosRapidos";
import { ProximosEventosWidget } from "@/components/modules/dashboard/ProximosEventosWidget";
import { MuralWidget } from "@/components/modules/dashboard/MuralWidget";
import { WidgetFallback } from "@/components/modules/dashboard/WidgetFallback";
import { statusEstoque } from "@/lib/estoqueStatus";
import { podeVerModulo, type PermissoesPorModulo } from "@/lib/permissoes";
import { primeiroNome } from "@/lib/utils";

export async function DashboardAdministrativo({
  nome,
  role,
  permissoes,
}: {
  nome: string;
  role: string;
  permissoes?: PermissoesPorModulo;
}) {
  // Achado real (set/2026): esse dashboard mostrava contagem de Funcionários/
  // Estoque/Chaves pra qualquer Role "Administrativo", mesmo pra quem a grade
  // de permissões restringiu a outro setor só (ex.: nutricionista com Role
  // Administrativo mas acesso só a Cardápio) — vazava dado de setor que a
  // pessoa nem consegue abrir pela sidebar. Cada card/atalho agora confere a
  // grade de verdade, não só o Role.
  const podeFuncionarios = podeVerModulo("/funcionarios", role, permissoes);
  const podeEstoque = podeVerModulo("/estoque", role, permissoes);
  const podeChaves = podeVerModulo("/chaves", role, permissoes);

  const [funcionariosAtivos, itens, chavesEmprestadas] = await Promise.all([
    podeFuncionarios ? prisma.funcionario.count({ where: { ativo: true } }) : Promise.resolve(0),
    podeEstoque ? prisma.itemEstoque.findMany({ orderBy: { nome: "asc" } }) : Promise.resolve([]),
    podeChaves ? prisma.emprestimoChave.count({ where: { devolucao: null } }) : Promise.resolve(0),
  ]);

  const criticos = itens
    .filter((i) => statusEstoque(i.quantidade, i.minimo) !== "ok")
    .sort((a, b) => a.quantidade / (a.minimo || 1) - b.quantidade / (b.minimo || 1));

  const atalhos: Atalho[] = [
    { label: "Mural", href: "/mural", icon: Megaphone, tone: "cat4" },
    ...(podeEstoque ? [{ label: "Estoque", href: "/estoque", icon: Package, tone: "cat6" as const }] : []),
    ...(podeChaves ? [{ label: "Chaves", href: "/chaves", icon: KeyRound, tone: "cat3" as const }] : []),
  ];

  return (
    <div>
      <PageHeader title={`Bem-vindo(a) de volta, ${primeiroNome(nome)}!`} subtitle="Funcionários, estoque e chaves" />

      {/* Chat tirado daqui — já tem ícone próprio na topbar, mesma revisão feita
          no dashboard do Admin (era triplo: topbar + sidebar + atalho aqui). */}
      <AtalhosRapidos itens={atalhos} />

      {(podeFuncionarios || podeEstoque || podeChaves) && (
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {podeFuncionarios && (
            <MetricCard icon={UserCog} tone="cat5" value={funcionariosAtivos} label="Funcionários ativos" href="/funcionarios" />
          )}
          {/* NOVO: ícone também troca junto com a cor — triângulo de alerta cinza
              com selo verde "Em dia" ficava contraditório (parece aviso, mas não é). */}
          {podeEstoque && (
            <MetricCard
              icon={criticos.length > 0 ? TriangleAlert : CircleCheck}
              tone={criticos.length > 0 ? "danger" : "success"}
              value={criticos.length}
              label="Itens críticos no estoque"
              badge={criticos.length > 0 ? "Atenção" : "Em dia"}
              badgeVariant={criticos.length > 0 ? "red" : "green"}
              href="/estoque"
            />
          )}
          {podeChaves && (
            <MetricCard icon={KeyRound} tone="cat6" value={chavesEmprestadas} label="Chaves emprestadas" subtext="Ainda não devolvidas" href="/chaves" />
          )}
        </div>
      )}

      {podeEstoque && (
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
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<WidgetFallback className="h-40" />}>
            <MuralWidget />
          </Suspense>
        </div>
        <Suspense fallback={<WidgetFallback className="h-60" />}>
          <ProximosEventosWidget />
        </Suspense>
      </div>
    </div>
  );
}
