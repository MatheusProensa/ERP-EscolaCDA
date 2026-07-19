import { UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AlunoTable } from "@/components/modules/alunos/AlunoTable";
import { ordenarTurmas } from "@/lib/utils";
import type { SituacaoMatricula } from "@prisma/client";

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<{ turma?: string; situacao?: string; busca?: string }>;
}) {
  const { turma, situacao, busca } = await searchParams;

  const anoLetivo = await prisma.anoLetivo.findFirst({ where: { ativo: true } });
  const turmas = ordenarTurmas(await prisma.turma.findMany({ where: { anoLetivoId: anoLetivo?.id } }));

  const matriculas = await prisma.matricula.findMany({
    where: {
      anoLetivoId: anoLetivo?.id,
      turmaId: turma || undefined,
      situacao: (situacao as SituacaoMatricula) || undefined,
      aluno: busca ? { nome: { contains: busca } } : undefined,
    },
    include: { aluno: true, turma: true },
    orderBy: { aluno: { nome: "asc" } },
  });

  return (
    <div>
      <PageHeader
        title="Alunos"
        subtitle={`${matriculas.length} aluno(s) encontrado(s)`}
        action={
          <Button href="/alunos/novo">
            <UserPlus className="h-4 w-4" />
            Novo aluno
          </Button>
        }
      />

      <Card className="mb-5 p-4">
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Input name="busca" placeholder="Buscar por nome..." defaultValue={busca} />
          <Select name="turma" defaultValue={turma ?? ""}>
            <option value="">Todas as turmas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </Select>
          <Select name="situacao" defaultValue={situacao ?? ""}>
            <option value="">Todas as situações</option>
            <option value="ATIVA">Ativa</option>
            <option value="TRANCADA">Trancada</option>
            <option value="CANCELADA">Cancelada</option>
            <option value="TRANSFERIDA">Transferida</option>
            <option value="CONCLUIDA">Concluída</option>
          </Select>
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
        </form>
      </Card>

      <Card>
        <AlunoTable matriculas={matriculas} />
      </Card>
    </div>
  );
}
