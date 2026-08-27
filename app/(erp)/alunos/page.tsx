import { UserPlus, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AlunoTable } from "@/components/modules/alunos/AlunoTable";
import { ExportButtons } from "@/components/ui/ExportButtons";
import { AcademicoTabs } from "@/components/modules/academico/AcademicoTabs";
import { ordenarTurmas } from "@/lib/utils";
import type { SituacaoMatricula } from "@prisma/client";

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<{ turma?: string; situacao?: string; busca?: string; censo?: string }>;
}) {
  const { turma, situacao, busca, censo } = await searchParams;
  const censoIncompleto = censo === "incompleto";

  const totalListaEspera = await prisma.listaEspera.count();
  const anoLetivo = await getAnoLetivoAtivo();
  const turmas = ordenarTurmas(await prisma.turma.findMany({ where: { anoLetivoId: anoLetivo?.id } }));

  const matriculas = await prisma.matricula.findMany({
    where: {
      anoLetivoId: anoLetivo?.id,
      turmaId: turma || undefined,
      situacao: (situacao as SituacaoMatricula) || undefined,
      aluno: {
        AND: [
          busca
            ? {
                OR: [
                  { nome: { contains: busca, mode: "insensitive" } },
                  { cpf: { contains: busca, mode: "insensitive" } },
                  {
                    responsaveis: {
                      some: {
                        OR: [
                          { nome: { contains: busca, mode: "insensitive" } },
                          { telefone: { contains: busca, mode: "insensitive" } },
                        ],
                      },
                    },
                  },
                ],
              }
            : {},
          censoIncompleto ? { OR: [{ racaCor: null }, { filiacao1: null }, { sexo: null }] } : {},
        ],
      },
    },
    select: {
      id: true,
      situacao: true,
      // "foto" fica de fora de propósito: é base64 e pesa MB por aluno — a listagem
      // só mostra um avatar de 28px, então não vale trazer o arquivo inteiro aqui.
      aluno: { select: { id: true, nome: true, dataNascimento: true } },
      turma: { select: { nome: true } },
    },
    orderBy: { aluno: { nome: "asc" } },
  });

  return (
    <div>
      <PageHeader
        title="Alunos"
        subtitle={`${matriculas.length} aluno(s) encontrado(s)`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons href="/api/relatorios/alunos" label="" params={{ turma, situacao, busca, censo }} />
            <Button href="/alunos/importar" variant="outline">
              <FileSpreadsheet className="h-4 w-4" />
              Importar planilha
            </Button>
            <Button href="/alunos/novo">
              <UserPlus className="h-4 w-4" />
              Novo aluno
            </Button>
          </div>
        }
      />

      <AcademicoTabs active="alunos" totalAlunos={matriculas.length} totalListaEspera={totalListaEspera} />

      {censoIncompleto && (
        <div className="mb-5 flex items-center gap-2">
          <Badge variant="amber">Filtro: dados incompletos para o censo</Badge>
          <Link href="/alunos" className="text-sm font-medium text-cda-blue hover:underline">
            Limpar filtro
          </Link>
        </div>
      )}

      <Card className="mb-5 p-4">
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Input name="busca" placeholder="Buscar por nome, CPF ou responsável..." defaultValue={busca} />
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
          <label className="flex items-center gap-2 text-sm text-cda-text2 sm:col-span-4">
            <input
              type="checkbox"
              name="censo"
              value="incompleto"
              defaultChecked={censoIncompleto}
              className="h-4 w-4 rounded border-cda-border"
            />
            Só alunos com dados incompletos pro censo
          </label>
        </form>
      </Card>

      <Card>
        <AlunoTable matriculas={matriculas} />
      </Card>
    </div>
  );
}
