import { UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BarraFiltro } from "@/components/ui/BarraFiltro";
import { AlunoTable } from "@/components/modules/alunos/AlunoTable";
import { ImportarMenu } from "@/components/modules/alunos/ImportarMenu";
import { ExportButtons } from "@/components/ui/ExportButtons";
import { AcademicoTabs } from "@/components/modules/academico/AcademicoTabs";
import { EscutaAoVivo } from "@/components/ui/EscutaAoVivo";
import { podeEditarModulo } from "@/lib/permissoes";
import { ordenarTurmas } from "@/lib/utils";

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<{ turma?: string; busca?: string; censo?: string; contrato?: string }>;
}) {
  const { turma, busca, censo, contrato } = await searchParams;
  const session = await auth();
  // Achado real (set/2026, mesma revisão do Cardápio): essa página mostrava
  // "Novo aluno" e o menu de Importar planilha pra qualquer um que enxergasse
  // /alunos, mesmo com "Só visualizar" marcado na grade.
  const podeEditar = podeEditarModulo("/alunos", session?.user.role ?? "", session?.user.permissoes);
  const censoIncompleto = censo === "incompleto";
  const contratoPendente = contrato === "pendente";

  const anoLetivo = await getAnoLetivoAtivo();
  const turmas = ordenarTurmas(await prisma.turma.findMany({ where: { anoLetivoId: anoLetivo?.id } }));

  // Total sem filtro nenhum — pra a barra dizer "N de M" (achado de auditoria
  // externa, set/2026: "N resultados" sozinho não diz se o filtro pegou pouco
  // porque filtrou bem, ou porque o cadastro é que tá vazio).
  const totalGeral = await prisma.matricula.count({ where: { anoLetivoId: anoLetivo?.id, situacao: "ATIVA" } });

  // Contagem por turma pro rótulo do filtro ("3º Ano (12)") — mesmo padrão do
  // kit de referência do Claude Design (Screens2.babel, turmasOpts).
  const contagemPorTurma = await prisma.matricula.groupBy({
    by: ["turmaId"],
    where: { anoLetivoId: anoLetivo?.id, situacao: "ATIVA" },
    _count: true,
  });
  const contagemPorTurmaId = new Map(contagemPorTurma.map((c) => [c.turmaId, c._count]));

  // Só quem está na escola hoje — não existe filtro pra ver quem já saiu.
  const matriculas = await prisma.matricula.findMany({
    where: {
      anoLetivoId: anoLetivo?.id,
      turmaId: turma || undefined,
      situacao: "ATIVA",
      contrato: contratoPendente ? { is: { assinado: false } } : undefined,
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
      // "foto" fica de fora de propósito: é base64 e pesa MB por aluno — a listagem
      // só mostra um avatar de 28px, então não vale trazer o arquivo inteiro aqui.
      aluno: { select: { id: true, nome: true, dataNascimento: true, responsaveis: true } },
      turma: { select: { nome: true } },
    },
    orderBy: { aluno: { nome: "asc" } },
  });

  return (
    <div>
      <EscutaAoVivo modulo="alunos" />
      <PageHeader
        title="Alunos"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons href="/api/relatorios/alunos" label="Relatório" params={{ turma, busca, censo, contrato }} />
            <ExportButtons href="/api/relatorios/contatos-alunos" label="Contatos" params={{ turma }} />
            {podeEditar && <ImportarMenu turmas={turmas.map((t) => ({ id: t.id, nome: t.nome }))} />}
            {podeEditar && (
              <Button href="/alunos/novo">
                <UserPlus className="h-4 w-4" />
                Novo aluno
              </Button>
            )}
          </div>
        }
      />

      <AcademicoTabs active="alunos" totalAlunos={matriculas.length} />

      <BarraFiltro
        buscaPlaceholder="Buscar por nome, CPF ou responsável..."
        selects={[
          {
            paramName: "turma",
            placeholder: "Todas as turmas",
            options: [
              { value: "", label: `Todas as turmas (${totalGeral})` },
              ...turmas.map((t) => ({ value: t.id, label: `${t.nome} (${contagemPorTurmaId.get(t.id) ?? 0})` })),
            ],
          },
        ]}
        checkboxes={[
          { paramName: "censo", value: "incompleto", label: "Só alunos com dados incompletos pro censo" },
          { paramName: "contrato", value: "pendente", label: "Só alunos com contrato aguardando assinatura" },
        ]}
        total={matriculas.length}
        totalGeral={totalGeral}
      />

      <Card>
        <AlunoTable matriculas={matriculas} />
      </Card>
    </div>
  );
}
