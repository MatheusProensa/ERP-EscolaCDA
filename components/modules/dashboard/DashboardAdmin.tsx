import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { contarAlunosAtivos } from "@/lib/alunos";
import { PageHeader } from "@/components/layout/PageHeader";
import { RelogioAtual } from "@/components/ui/RelogioAtual";
import { EscutaAoVivo } from "@/components/ui/EscutaAoVivo";
import { WidgetFallback } from "@/components/modules/dashboard/WidgetFallback";
import { MetricasGerais } from "@/components/modules/dashboard/MetricasGerais";
import { CensoAlerta } from "@/components/modules/dashboard/CensoAlerta";
import { ProximosEventosWidget } from "@/components/modules/dashboard/ProximosEventosWidget";
import { MuralWidget } from "@/components/modules/dashboard/MuralWidget";
import { PedagogicoResumoWidget } from "@/components/modules/dashboard/PedagogicoResumoWidget";
import { AniversariantesSemanaWidget } from "@/components/modules/dashboard/AniversariantesSemanaWidget";
import { AcessoRapido } from "@/components/modules/dashboard/AcessoRapido";
import { podeVerModulo, type PermissoesPorModulo } from "@/lib/permissoes";
import { primeiroNome, hojeBrasilia } from "@/lib/utils";
import { semanasDoMes, statusTurmaMesDeContagem, type StatusTurmaMes } from "@/lib/planejamento";

const MESES_LONGO = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export async function DashboardAdmin({
  nome,
  role,
  permissoes,
}: {
  nome: string;
  role: string;
  permissoes?: PermissoesPorModulo;
}) {
  // ADMIN sempre passa (acessoPermitido libera tudo pra ele) — mas DIRECAO e
  // FINANCEIRO também caem nesse dashboard, e a grade de permissões pode
  // restringir qualquer um deles do mesmo jeito que já aconteceu com
  // "Administrativo" (nutricionista só com Cardápio). Confere de verdade.
  const podeAlunos = podeVerModulo("/alunos", role, permissoes);
  const podeAcademico = podeVerModulo("/academico", role, permissoes);
  const podeFuncionarios = podeVerModulo("/funcionarios", role, permissoes);
  // Pedagógico não está na grade por pessoa (MODULOS) — vale pelo pacote do
  // Role de sempre (podeVerModulo cai pra isso quando a rota não é um
  // setor da grade, ver lib/permissoes.ts).
  const podePedagogico = podeVerModulo("/pedagogico", role, permissoes);
  const anoLetivo = await getAnoLetivoAtivo();
  const hoje = hojeBrasilia();
  const anoMesAtual = `${hoje.getUTCFullYear()}-${String(hoje.getUTCMonth() + 1).padStart(2, "0")}`;
  const semanasMes = semanasDoMes(hoje);

  const [totalAlunos, turmasAtivas, censoIncompleto, totalFuncionarios, contratosPendentes, dadosPedagogico] = await Promise.all([
    podeAlunos ? contarAlunosAtivos(anoLetivo?.id) : Promise.resolve(0),
    podeAcademico ? prisma.turma.count({ where: { anoLetivoId: anoLetivo?.id } }) : Promise.resolve(0),
    podeAlunos
      ? prisma.aluno.count({
          where: {
            matriculas: { some: { situacao: "ATIVA" } },
            OR: [{ racaCor: null }, { filiacao1: null }, { sexo: null }],
          },
        })
      : Promise.resolve(0),
    podeFuncionarios ? prisma.funcionario.count() : Promise.resolve(0),
    podeAlunos ? prisma.contrato.count({ where: { assinado: false } }) : Promise.resolve(0),
    podePedagogico && anoLetivo
      ? Promise.all([
          prisma.turma.findMany({ where: { anoLetivoId: anoLetivo.id }, select: { id: true } }),
          prisma.prazoPedagogico.findUnique({ where: { mes: anoMesAtual } }),
          prisma.planejamento.findMany({
            where: { semanaInicio: { in: semanasMes }, status: { in: ["ENVIADO", "APROVADO", "DEVOLVIDO"] } },
            select: { turmaId: true, status: true },
          }),
          prisma.folhaMensal.findMany({
            where: { semanaInicio: { in: semanasMes }, status: { in: ["ENVIADO", "APROVADO", "DEVOLVIDO"] } },
            select: { turmaId: true, tipo: true, status: true },
          }),
        ])
      : Promise.resolve(null),
  ]);

  // Resumo pedagógico do mês (card novo do Dashboard) — soma os 4 documentos
  // (Planejamento, Roteiro — mesmo sinal do Planejamento, Atividade Gráfica,
  // Tema Literário) de TODAS as turmas, mesma regra de "aprovado" já usada
  // na Fila de Impressão (ver app/(erp)/impressao/page.tsx): só conta
  // entregue quando TODAS as semanas do mês foram aprovadas.
  let pedagogicoEntregues = 0;
  let pedagogicoTotal = 0;
  let turmasCompletas = 0;
  let turmasAndamento = 0;
  let turmasAtrasadas = 0;
  if (dadosPedagogico) {
    const [turmasPedagogico, prazo, planejamentosMes, folhasMes] = dadosPedagogico;
    const prazoVencido = !!prazo && hoje > prazo.dataLimite;

    function statusPlanejamento(turmaId: string): StatusTurmaMes {
      const contagem = planejamentosMes
        .filter((p) => p.turmaId === turmaId)
        .reduce(
          (acc, p) => {
            acc.total += 1;
            if (p.status === "APROVADO") acc.aprovadas += 1;
            if (p.status === "DEVOLVIDO") acc.devolvidas += 1;
            return acc;
          },
          { total: 0, aprovadas: 0, devolvidas: 0 }
        );
      return statusTurmaMesDeContagem(contagem.total > 0 ? contagem : undefined, semanasMes.length, prazoVencido);
    }
    function statusFolha(turmaId: string, tipo: "ATIVIDADE_GRAFICA" | "TEMA_LITERARIO"): StatusTurmaMes {
      const contagem = folhasMes
        .filter((f) => f.turmaId === turmaId && f.tipo === tipo)
        .reduce(
          (acc, f) => {
            acc.total += 1;
            if (f.status === "APROVADO") acc.aprovadas += 1;
            if (f.status === "DEVOLVIDO") acc.devolvidas += 1;
            return acc;
          },
          { total: 0, aprovadas: 0, devolvidas: 0 }
        );
      return statusTurmaMesDeContagem(contagem.total > 0 ? contagem : undefined, semanasMes.length, prazoVencido);
    }

    pedagogicoTotal = turmasPedagogico.length * 4;
    for (const t of turmasPedagogico) {
      const planejStatus = statusPlanejamento(t.id);
      const feitos = [
        planejStatus === "APROVADO",
        planejStatus === "APROVADO", // Roteiro — mesmo sinal
        statusFolha(t.id, "ATIVIDADE_GRAFICA") === "APROVADO",
        statusFolha(t.id, "TEMA_LITERARIO") === "APROVADO",
      ].filter(Boolean).length;
      pedagogicoEntregues += feitos;
      if (feitos === 4) turmasCompletas += 1;
      else if (prazoVencido) turmasAtrasadas += 1;
      else turmasAndamento += 1;
    }
  }

  return (
    <div>
      <EscutaAoVivo modulo="dashboard" />
      <PageHeader
        title={`Bem-vindo(a) de volta, ${primeiroNome(nome)}!`}
        subtitle="Visão geral da Escola CDA — todos os setores"
        extra={<RelogioAtual />}
      />

      <div className="mb-5">
        <MetricasGerais
          totalAlunos={totalAlunos}
          turmasAtivas={turmasAtivas}
          totalFuncionarios={totalFuncionarios}
          contratosPendentes={contratosPendentes}
          pedagogicoEntregues={pedagogicoEntregues}
          pedagogicoTotal={pedagogicoTotal}
          podeAlunos={podeAlunos}
          podeAcademico={podeAcademico}
          podeFuncionarios={podeFuncionarios}
          podePedagogico={podePedagogico}
        />
      </div>

      {podeAlunos && (
        <div className="mb-5">
          <CensoAlerta quantidade={censoIncompleto} />
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Suspense fallback={<WidgetFallback className="h-40" />}>
            <MuralWidget />
          </Suspense>
        </div>
        <Suspense fallback={<WidgetFallback className="h-60" />}>
          <ProximosEventosWidget />
        </Suspense>
        {podePedagogico && (
          <PedagogicoResumoWidget
            mesLabel={`${MESES_LONGO[hoje.getUTCMonth()]} ${hoje.getUTCFullYear()}`}
            entregues={pedagogicoEntregues}
            total={pedagogicoTotal}
            turmasCompletas={turmasCompletas}
            turmasAndamento={turmasAndamento}
            turmasAtrasadas={turmasAtrasadas}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Suspense fallback={<WidgetFallback className="h-40" />}>
            <AniversariantesSemanaWidget />
          </Suspense>
        </div>
        <div className="lg:col-span-2">
          <AcessoRapido />
        </div>
      </div>
    </div>
  );
}
