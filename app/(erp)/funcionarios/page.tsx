import { UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FuncionarioTable } from "@/components/modules/funcionarios/FuncionarioTable";

export default async function FuncionariosPage({
  searchParams,
}: {
  searchParams: Promise<{ setor?: string; busca?: string }>;
}) {
  const { setor, busca } = await searchParams;

  const setores = await prisma.funcionario.findMany({
    select: { setor: true },
    distinct: ["setor"],
    orderBy: { setor: "asc" },
  });

  const funcionarios = await prisma.funcionario.findMany({
    where: {
      setor: setor || undefined,
      nome: busca ? { contains: busca } : undefined,
    },
    orderBy: { nome: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Funcionários"
        subtitle={`${funcionarios.length} funcionário(s) encontrado(s)`}
        action={
          <Button href="/funcionarios/novo">
            <UserPlus className="h-4 w-4" />
            Novo funcionário
          </Button>
        }
      />

      <Card className="mb-5 p-4">
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input name="busca" placeholder="Buscar por nome..." defaultValue={busca} />
          <Select name="setor" defaultValue={setor ?? ""}>
            <option value="">Todos os setores</option>
            {setores.map((s) => (
              <option key={s.setor} value={s.setor}>
                {s.setor}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
        </form>
      </Card>

      <Card>
        <FuncionarioTable funcionarios={funcionarios} />
      </Card>
    </div>
  );
}
