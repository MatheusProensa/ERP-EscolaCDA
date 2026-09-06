import { UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ExportButtons } from "@/components/ui/ExportButtons";
import { FuncionarioTable } from "@/components/modules/funcionarios/FuncionarioTable";
import { podeEditarModulo } from "@/lib/permissoes";
import { SETORES, agruparPorSetor } from "@/lib/utils";

export default async function FuncionariosPage({
  searchParams,
}: {
  searchParams: Promise<{ setor?: string; busca?: string }>;
}) {
  const { setor, busca } = await searchParams;
  const session = await auth();
  const podeEditar = podeEditarModulo("/funcionarios", session?.user.role ?? "", session?.user.permissoes);

  const funcionarios = await prisma.funcionario.findMany({
    where: {
      setor: setor || undefined,
      nome: busca ? { contains: busca, mode: "insensitive" } : undefined,
    },
    orderBy: { nome: "asc" },
  });

  const grupos = agruparPorSetor(funcionarios);

  return (
    <div>
      <PageHeader
        title="Funcionários"
        subtitle={`${funcionarios.length} funcionário(s) encontrado(s), organizados por setor`}
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

      <Card className="mb-5 p-4">
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input name="busca" placeholder="Buscar por nome..." defaultValue={busca} />
          <Select name="setor" defaultValue={setor ?? ""}>
            <option value="">Todos os setores</option>
            {SETORES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
        </form>
      </Card>

      {grupos.length === 0 && (
        <Card>
          <FuncionarioTable funcionarios={[]} podeEditar={podeEditar} />
        </Card>
      )}

      <div className="flex flex-col gap-5">
        {grupos.map((grupo) => (
          <Card
            key={grupo.setor}
            title={grupo.setor}
            action={<Badge variant="count">{grupo.itens.length}</Badge>}
          >
            <FuncionarioTable funcionarios={grupo.itens} mostrarSetor={false} podeEditar={podeEditar} />
          </Card>
        ))}
      </div>
    </div>
  );
}
