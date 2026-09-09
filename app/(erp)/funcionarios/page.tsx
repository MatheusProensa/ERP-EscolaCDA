import { UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BarraFiltro } from "@/components/ui/BarraFiltro";
import { ExportButtons } from "@/components/ui/ExportButtons";
import { FuncionarioTable } from "@/components/modules/funcionarios/FuncionarioTable";
import { EscutaAoVivo } from "@/components/ui/EscutaAoVivo";
import { podeEditarModulo } from "@/lib/permissoes";
import { SETORES } from "@/lib/utils";

/** Achado de auditoria externa (set/2026): a listagem era N Cards, um por
 * setor (10 setores = 10 cabeçalhos de Card + 10 tabelas) — a tarefa
 * dominante aqui é achar UMA pessoa, e dez listas custam mais do que uma só
 * (dez cabeçalhos ocupam altura que não carrega informação, e um filtro que
 * corta pra 3 pessoas de setores diferentes deixa 3 Cards de uma linha cada).
 * Vira 1 Card + 1 tabela, mesmo padrão que Alunos já usava — a visão de
 * "organização por setor" que os 10 Cards davam de graça agora mora no
 * filtro (as opções levam a contagem no rótulo: "Pedagógico (5)"). */
export default async function FuncionariosPage({
  searchParams,
}: {
  searchParams: Promise<{ setor?: string; busca?: string }>;
}) {
  const { setor, busca } = await searchParams;
  const session = await auth();
  const podeEditar = podeEditarModulo("/funcionarios", session?.user.role ?? "", session?.user.permissoes);

  const [funcionarios, totalGeral, contagemPorSetor] = await Promise.all([
    prisma.funcionario.findMany({
      where: {
        setor: setor || undefined,
        nome: busca ? { contains: busca, mode: "insensitive" } : undefined,
      },
      orderBy: [{ setor: "asc" }, { nome: "asc" }],
    }),
    prisma.funcionario.count(),
    prisma.funcionario.groupBy({ by: ["setor"], _count: true }),
  ]);
  const contagemPorSetorNome = new Map(contagemPorSetor.map((c) => [c.setor, c._count]));

  return (
    <div>
      <EscutaAoVivo modulo="funcionarios" />
      <PageHeader
        title="Funcionários"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons href="/api/relatorios/funcionarios" label="Lista completa" params={{ setor }} />
            <ExportButtons href="/api/relatorios/funcionarios-contatos" label="Contatos" />
            {podeEditar && (
              <Button href="/funcionarios/novo">
                <UserPlus className="h-4 w-4" />
                Novo funcionário
              </Button>
            )}
          </div>
        }
      />

      <BarraFiltro
        buscaPlaceholder="Buscar por nome..."
        selects={[
          {
            paramName: "setor",
            placeholder: "Todos os setores",
            options: [
              { value: "", label: `Todos os setores (${totalGeral})` },
              ...SETORES.map((s) => ({ value: s, label: `${s} (${contagemPorSetorNome.get(s) ?? 0})` })),
            ],
          },
        ]}
        total={funcionarios.length}
        totalGeral={totalGeral}
      />

      <Card>
        <FuncionarioTable funcionarios={funcionarios} podeEditar={podeEditar} />
      </Card>
    </div>
  );
}
