import Link from "next/link";
import {
  GraduationCap,
  Sparkles,
  NotebookPen,
  FileText,
  Image as ImageIcon,
  ClipboardCheck,
  Users,
  CheckCircle2,
  Clock,
  ScrollText,
  BookOpen,
  CalendarClock,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import { PedagogicoTutorial } from "@/components/modules/pedagogico/PedagogicoTutorial";
import { PrazoPedagogicoForm } from "@/components/modules/pedagogico/PrazoPedagogicoForm";
import { DocumentoPedagogicoCard } from "@/components/modules/pedagogico/DocumentoPedagogicoCard";
import { PainelCoordenadoraClient } from "@/components/modules/pedagogico/PainelCoordenadoraClient";
import { AcompanhamentoCharts } from "@/components/modules/pedagogico/AcompanhamentoCharts";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { hojeBrasilia, ordenarTurmas } from "@/lib/utils";
import {
  semanasDoMes,
  isoData,
  STATUS_TURMA_MES_LABEL,
  STATUS_TURMA_MES_COR,
  type StatusTurmaMes,
} from "@/lib/planejamento";

const TURNO_LABEL: Record<string, string> = { MANHA: "Manhã", TARDE: "Tarde" };
const MESES_CURTO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Só as segundas-feiras cujo PRÓPRIO calendário cai dentro do mês (ano,
 * mes0) — diferente de semanasDoMes (que empresta a semana de fronteira pro
 * mês seguinte, pensada pra cobrança do mês atual). Usada só pela Evolução
 * mensal/Destaques (6 meses pra trás): aqui os buckets precisam ser
 * disjuntos, senão uma mesma semana contaria em 2 meses do gráfico. */
function segundasDoMesPuro(ano: number, mes0: number): string[] {
  const resultado: string[] = [];
  const d = new Date(Date.UTC(ano, mes0, 1));
  while (d.getUTCMonth() === mes0) {
    if (d.getUTCDay() === 1) resultado.push(isoData(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return resultado;
}

function streakAtual(arr: boolean[], valor: boolean): number {
  let streak = 0;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] === valor) streak++;
    else break;
  }
  return streak;
}

/** Hub da professora dentro da Área Pedagógica — mostra o vínculo dela
 * (turma como regente, matéria×turmas como especialista) e leva pras 3
 * entregas (planejamento, parecer, portfólio), todas já reais (task #18). */
export default async function PedagogicoPage() {
  const session = await auth();
  const souCoordenadora = session?.user.role === "ADMIN" || !!session?.user.coordenaAreaPedagogica;

  const hoje = hojeBrasilia();
  const anoMesAtual = `${hoje.getUTCFullYear()}-${String(hoje.getUTCMonth() + 1).padStart(2, "0")}`;

  const [vinculos, anoLetivo, prazo] = await Promise.all([
    session?.user.id
      ? prisma.vinculoPedagogico.findMany({
          where: { userId: session.user.id },
          include: { turma: { select: { id: true, nome: true, turno: true } } },
        })
      : Promise.resolve([]),
    getAnoLetivoAtivo(),
    prisma.prazoPedagogico.findUnique({ where: { mes: anoMesAtual } }),
  ]);
  const dataLimite = prazo?.dataLimite ?? null;
  const prazoVencido = !!dataLimite && hoje > dataLimite;

  // Ordem pedagógica de verdade (Berçário → Maternal → Pré → Anos), não
  // alfabética — "1º Ano" vindo alfabeticamente antes de "Berçário" saía
  // errado (achado real, dono, set/2026). Mesmo helper usado em Acadêmico.
  const comoRegente = ordenarTurmas(vinculos.filter((v) => v.papel === "REGENTE").map((v) => ({ ...v, nome: v.turma.nome })));
  const comoEspecialista = ordenarTurmas(vinculos.filter((v) => v.papel === "ESPECIALISTA").map((v) => ({ ...v, nome: v.turma.nome })));

  // Agrupa especialista por matéria — a mesma pessoa dá a mesma matéria em
  // várias turmas (achado real, out/2026: Ed. Física, Musicalização, Inglês).
  const especialistaPorMateria = new Map<string, typeof comoEspecialista>();
  for (const v of comoEspecialista) {
    const chave = v.materia ?? "Sem matéria";
    especialistaPorMateria.set(chave, [...(especialistaPorMateria.get(chave) ?? []), v]);
  }

  // "Entregue" = já foi enviado (ENVIADO/APROVADO/DEVOLVIDO — as 3 são "a
  // regente já fez a parte dela") em TODAS as semanas do mês atual. A
  // cobrança da coordenadora é mensal (correção do dono, set/2026:
  // "planejamento é por mês") e a entrega em si é um clique explícito no
  // botão "Finalizar" de cada semana (pedido do dono, set/2026: botão de
  // verdade em vez do status ser só heurística de "tem algo preenchido").
  const semanasMes = semanasDoMes(hoje);
  const planejamentosMes = await prisma.planejamento.findMany({
    where: { semanaInicio: { in: semanasMes }, status: { in: ["ENVIADO", "APROVADO", "DEVOLVIDO"] } },
    select: { id: true, turmaId: true, status: true, semanaInicio: true },
  });
  const statusPorTurma = new Map<string, { total: number; aprovadas: number; devolvidas: number }>();
  for (const p of planejamentosMes) {
    const atual = statusPorTurma.get(p.turmaId) ?? { total: 0, aprovadas: 0, devolvidas: 0 };
    atual.total += 1;
    if (p.status === "APROVADO") atual.aprovadas += 1;
    if (p.status === "DEVOLVIDO") atual.devolvidas += 1;
    statusPorTurma.set(p.turmaId, atual);
  }
  const entreguesMesAtual = new Set(
    [...statusPorTurma.entries()].filter(([, s]) => s.total >= semanasMes.length).map(([turmaId]) => turmaId)
  );
  // Status pra exibir por turma — devolvido pesa mais (precisa de ação da
  // regente), depois aprovado (só quando TODAS as semanas foram aprovadas),
  // depois "aguardando revisão" (enviou mas a coordenadora ainda não olhou).
  // Pendente vira Atrasado quando já passou do prazo do mês (pedido do dono,
  // set/2026: "coordenadora define o prazo do mês"). Rótulo/cor/badge dessas
  // 5 chaves moraram pra lib/planejamento.ts (STATUS_TURMA_MES_*) — usados
  // aqui e no painel mestre-detalhe (PainelCoordenadoraClient), pra nunca
  // dessincronizar.
  function statusExibicao(turmaId: string): StatusTurmaMes {
    const s = statusPorTurma.get(turmaId);
    if (!s || s.total < semanasMes.length) return prazoVencido ? "ATRASADO" : "PENDENTE";
    if (s.devolvidas > 0) return "DEVOLVIDO";
    if (s.aprovadas >= semanasMes.length) return "APROVADO";
    return "ENVIADO";
  }
  const STATUS_LABEL = STATUS_TURMA_MES_LABEL;
  const STATUS_COR = STATUS_TURMA_MES_COR;

  // Quantas folhas de Atividade Gráfica / Tema Literário já foram preenchidas
  // esse mês, por turma — os 2 não são documentos mensais (são pontuais, por
  // dia), então não têm status de aprovação; só mostra contagem + link pro
  // Planejamento (achado real: quem preenche é lá dentro, dia a dia).
  const diasDoMesRegente =
    comoRegente.length > 0
      ? await prisma.planejamentoDia.findMany({
          where: { planejamento: { turmaId: { in: comoRegente.map((v) => v.turma.id) }, semanaInicio: { in: semanasMes } } },
          select: { conteudo: true, planejamento: { select: { turmaId: true } } },
        })
      : [];
  const folhasPorTurma = new Map<string, { grafica: number; literario: number }>();
  for (const dia of diasDoMesRegente) {
    const conteudo = dia.conteudo as { folhaAtividadeGrafica?: string; folhaTemaLiterario?: string } | null;
    const atual = folhasPorTurma.get(dia.planejamento.turmaId) ?? { grafica: 0, literario: 0 };
    if (conteudo?.folhaAtividadeGrafica) atual.grafica += 1;
    if (conteudo?.folhaTemaLiterario) atual.literario += 1;
    folhasPorTurma.set(dia.planejamento.turmaId, atual);
  }

  // Texto do prazo pra mostrar no card da turma (pedido do dono: "visão hoje",
  // "faltam N documentos" viraram "quantos dias faltam/passaram do prazo").
  const diasParaPrazo = dataLimite ? Math.round((dataLimite.getTime() - hoje.getTime()) / 86400000) : null;
  function textoPrazo(): string | null {
    if (!dataLimite || diasParaPrazo === null) return null;
    if (diasParaPrazo < 0) return `Prazo vencido há ${Math.abs(diasParaPrazo)} dia${Math.abs(diasParaPrazo) === 1 ? "" : "s"}`;
    if (diasParaPrazo === 0) return "Prazo é hoje";
    return `${diasParaPrazo} dia${diasParaPrazo === 1 ? "" : "s"} até o prazo`;
  }
  // Valor curto pro card de métrica "Prazo atual" (pedido do dono, mockup do
  // Gemini) — mesma conta de textoPrazo(), só que como tile de resumo em vez
  // de frase.
  const prazoAtualValor =
    diasParaPrazo === null ? "—" : diasParaPrazo < 0 ? "Vencido" : diasParaPrazo === 0 ? "Hoje" : `${diasParaPrazo} dia${diasParaPrazo === 1 ? "" : "s"}`;

  // Coordenadora vê TODAS as turmas do ano letivo ativo, com a regente e o
  // status do mês — é o "dashboard bem bom pra acompanhar as professoras"
  // pedido desde o início.
  const todasTurmas = souCoordenadora && anoLetivo
    ? ordenarTurmas(
        await prisma.turma.findMany({
          where: { anoLetivoId: anoLetivo.id },
          include: {
            vinculosPedagogico: { where: { papel: "REGENTE" }, include: { user: { select: { name: true, foto: true } } } },
          },
        })
      )
    : [];
  const turmasAtrasadasCount = todasTurmas.filter((t) => statusExibicao(t.id) === "ATRASADO").length;

  // Pontualidade do mês — pedido do dono, inspirado num mockup que ele
  // trouxe do Gemini: "quero todas aquelas funções". Compara o 1º envio de
  // cada semana (PlanejamentoVersao numero=1 — a tentativa original, não um
  // reenvio depois de devolvido) com o prazo do mês. Sem prazo definido, não
  // dá pra dizer o que é "no prazo" — fica null (painel mostra "sem prazo").
  const primeirasVersoesMes = dataLimite
    ? await prisma.planejamentoVersao.findMany({
        where: { numero: 1, planejamento: { semanaInicio: { in: semanasMes } } },
        select: { enviadoEm: true, planejamento: { select: { turmaId: true } } },
      })
    : [];
  const pontualidadePorTurma = new Map<string, { total: number; noPrazo: number }>();
  for (const v of primeirasVersoesMes) {
    const atual = pontualidadePorTurma.get(v.planejamento.turmaId) ?? { total: 0, noPrazo: 0 };
    atual.total += 1;
    if (dataLimite && v.enviadoEm <= dataLimite) atual.noPrazo += 1;
    pontualidadePorTurma.set(v.planejamento.turmaId, atual);
  }

  // Evolução mensal + Destaques (últimos 6 meses, mês atual incluso) — outro
  // pedaço do mesmo mockup. Métrica mais simples que a pontualidade acima
  // ("entregou TODAS as semanas daquele mês", sem olhar prazo): meses
  // passados não têm PrazoPedagogico gravado (o recurso é novo), não dá pra
  // dizer se foi "no prazo" antes de existir prazo pra comparar.
  const janelaMeses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - (5 - i), 1));
    return { ano: d.getUTCFullYear(), mes0: d.getUTCMonth(), label: MESES_CURTO[d.getUTCMonth()] };
  });
  const mondaysPorMes = janelaMeses.map(({ ano, mes0 }) => segundasDoMesPuro(ano, mes0));
  const inicioJanela = new Date(Date.UTC(janelaMeses[0].ano, janelaMeses[0].mes0, 1));
  const planejamentosJanela =
    souCoordenadora && anoLetivo
      ? await prisma.planejamento.findMany({
          where: { semanaInicio: { gte: inicioJanela }, status: { in: ["ENVIADO", "APROVADO", "DEVOLVIDO"] } },
          select: { turmaId: true, semanaInicio: true },
        })
      : [];
  const entreguesPorSemana = new Set(planejamentosJanela.map((p) => `${p.turmaId}|${isoData(p.semanaInicio)}`));
  const statusMensalPorTurma = new Map<string, boolean[]>();
  for (const t of todasTurmas) {
    statusMensalPorTurma.set(
      t.id,
      mondaysPorMes.map((mondays) => mondays.length > 0 && mondays.every((iso) => entreguesPorSemana.has(`${t.id}|${iso}`)))
    );
  }
  const evolucaoMensal = janelaMeses.map(({ label }, i) => {
    const emDia = todasTurmas.filter((t) => statusMensalPorTurma.get(t.id)?.[i]).length;
    return { label, pct: todasTurmas.length > 0 ? Math.round((emDia / todasTurmas.length) * 100) : 0 };
  });
  type Destaque = { turmaNome: string; regenteNome: string | null; streak: number };
  let destaquePontual: Destaque | null = null;
  let destaqueAtencao: Destaque | null = null;
  for (const t of todasTurmas) {
    const arr = statusMensalPorTurma.get(t.id) ?? [];
    const regenteNome = t.vinculosPedagogico[0]?.user.name ?? null;
    const streakEmDia = streakAtual(arr, true);
    const streakForaDia = streakAtual(arr, false);
    if (streakEmDia >= 2 && (!destaquePontual || streakEmDia > destaquePontual.streak)) {
      destaquePontual = { turmaNome: t.nome, regenteNome, streak: streakEmDia };
    }
    if (streakForaDia >= 2 && (!destaqueAtencao || streakForaDia > destaqueAtencao.streak)) {
      destaqueAtencao = { turmaNome: t.nome, regenteNome, streak: streakForaDia };
    }
  }

  // Monta o resumo de cada turma pro painel mestre-detalhe da coordenadora
  // (PainelCoordenadoraClient) — busca/filtro/seleção acontecem no cliente
  // (o dado já está todo aqui, não precisa de ida e volta ao servidor a cada
  // tecla), então passa a lista INTEIRA, sem filtrar no servidor.
  const turmasResumo = todasTurmas.map((t) => {
    const regenteUser = t.vinculosPedagogico[0]?.user;
    const semanasInfo = statusPorTurma.get(t.id);
    const folhas = folhasPorTurma.get(t.id) ?? { grafica: 0, literario: 0 };
    const pontualInfo = pontualidadePorTurma.get(t.id);
    const semanas = planejamentosMes
      .filter((p) => p.turmaId === t.id)
      .map((p) => ({ id: p.id, semanaInicio: isoData(p.semanaInicio), status: p.status as "ENVIADO" | "APROVADO" | "DEVOLVIDO" }))
      .sort((a, b) => a.semanaInicio.localeCompare(b.semanaInicio));
    return {
      id: t.id,
      nome: t.nome,
      turno: t.turno,
      regenteNome: regenteUser?.name ?? null,
      regenteFoto: regenteUser?.foto ?? null,
      statusTurma: statusExibicao(t.id),
      semanasEnviadas: semanasInfo?.total ?? 0,
      semanasTotal: semanasMes.length,
      folhas,
      semanas,
      roteiroHref: `/api/planejamentos/roteiro-pdf?turmaId=${t.id}&mes=${anoMesAtual}`,
      pontualidadePct: dataLimite && pontualInfo && pontualInfo.total > 0 ? Math.round((pontualInfo.noPrazo / pontualInfo.total) * 100) : null,
    };
  });

  // Ordem pensada pra achar rápido o que se usa todo dia primeiro (pedido
  // explícito do dono: página bem organizada pra fácil utilização) —
  // coordenadora vê o painel de acompanhamento logo de cara (é o motivo
  // principal dela entrar aqui), depois vem "Suas turmas". Nem Projeto
  // pedagógico nem Modelo de parecer moram mais aqui — os dois viraram por
  // turma (correção do dono, set/2026), vivem dentro de
  // /pedagogico/planejamento/[turmaId] e /pedagogico/parecer/[turmaId].
  return (
    <div>
      <PedagogicoTutorial />
      <PageHeader title="Área Pedagógica" subtitle="Suas turmas — planejamento, parecer e portfólio" />

      {souCoordenadora && todasTurmas.length > 0 && (
        <div className="mb-6">
          <div className="mb-3">
            <PrazoPedagogicoForm anoMes={anoMesAtual} dataLimiteInicial={dataLimite ? dataLimite.toISOString().slice(0, 10) : null} />
          </div>
          {/* 5 tiles — pedido do dono (mockup do Gemini): "Atrasadas" sempre
              visível como métrica própria (antes só aparecia trocando de lugar
              com "Ainda pendentes" depois do prazo vencer) + um tile novo de
              "Prazo atual". */}
          <div className="mb-3 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <MetricCard
              icon={Users}
              tone="cat1"
              value={`${entreguesMesAtual.size}/${todasTurmas.length}`}
              label="Turmas em dia"
              subtext="Planejamento entregue esse mês"
            />
            <MetricCard
              icon={ClipboardCheck}
              tone="cat5"
              value={todasTurmas.filter((t) => statusExibicao(t.id) === "ENVIADO").length}
              label="Aguardando revisão"
              subtext="Enviado, ainda não revisado"
            />
            <MetricCard
              icon={CheckCircle2}
              tone="success"
              value={todasTurmas.filter((t) => statusExibicao(t.id) === "APROVADO").length}
              label="Aprovadas"
              subtext="Todas as semanas aprovadas"
            />
            <MetricCard
              icon={Clock}
              tone={turmasAtrasadasCount > 0 ? "critical" : "neutral"}
              value={turmasAtrasadasCount}
              label="Atrasadas"
              subtext="Passou do prazo do mês"
            />
            <MetricCard
              icon={CalendarClock}
              tone={prazoVencido ? "critical" : "warning"}
              value={prazoAtualValor}
              label="Prazo atual"
              subtext={dataLimite ? dataLimite.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }) : "Não definido"}
            />
          </div>
          <PainelCoordenadoraClient turmas={turmasResumo} prazoTexto={textoPrazo()} prazoVencido={prazoVencido} />
          <div className="mt-5">
            <AcompanhamentoCharts
              turmas={turmasResumo}
              evolucaoMensal={evolucaoMensal}
              destaquePontual={destaquePontual}
              destaqueAtencao={destaqueAtencao}
            />
          </div>
        </div>
      )}

      {vinculos.length === 0 ? (
        // Pra coordenadora que não dá aula, isso é o esperado (ela acompanha
        // pelo painel acima, não precisa de vínculo próprio) — só soa como
        // problema de fato pra quem deveria ter turma e não tem.
        !souCoordenadora && (
          <Card>
            <EmptyState
              icon={GraduationCap}
              title="Você ainda não tem turma vinculada"
              subtitle='Peça pra Direção configurar isso na tela de Usuários, na seção "Vínculo com turmas".'
            />
          </Card>
        )
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-cda-text">Suas turmas</h2>
            {!souCoordenadora && dataLimite && (
              <span className={`text-xs font-medium ${prazoVencido ? "text-cda-red" : "text-cda-text3"}`}>
                Prazo do planejamento esse mês: {dataLimite.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" })}
                {prazoVencido && " — vencido"}
              </span>
            )}
          </div>
          {comoRegente.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-cda-text2">Como regente</h3>
              <div className="flex flex-col gap-4">
                {comoRegente.map((v) => {
                  const statusTurma = statusExibicao(v.turma.id);
                  const semanasInfo = statusPorTurma.get(v.turma.id);
                  const folhas = folhasPorTurma.get(v.turma.id) ?? { grafica: 0, literario: 0 };
                  const prazoTexto = textoPrazo();
                  const roteiroHref = `/api/planejamentos/roteiro-pdf?turmaId=${v.turma.id}&mes=${anoMesAtual}`;
                  return (
                    <div key={v.id} className="rounded-[10px] border border-cda-border bg-cda-surface p-4">
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-cda-blue" />
                          <span className="text-sm font-semibold text-cda-text">{v.turma.nome}</span>
                          <span className="text-xs text-cda-text3">({TURNO_LABEL[v.turma.turno] ?? v.turma.turno})</span>
                        </div>
                        {prazoTexto && (
                          <span className={`text-xs font-medium ${prazoVencido ? "text-cda-red" : "text-cda-text3"}`}>{prazoTexto}</span>
                        )}
                      </div>
                      <p className="mb-3 text-xs text-cda-text3">
                        {semanasInfo?.total ?? 0} de {semanasMes.length} semana{semanasMes.length === 1 ? "" : "s"} do Planejamento enviadas
                        esse mês
                      </p>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <DocumentoPedagogicoCard
                          icon={NotebookPen}
                          cor={STATUS_COR[statusTurma]}
                          titulo="Planejamento"
                          statusLabel={STATUS_LABEL[statusTurma]}
                          subtitulo={`${semanasInfo?.total ?? 0} de ${semanasMes.length} semana${semanasMes.length === 1 ? "" : "s"} enviadas`}
                          href={`/pedagogico/planejamento/${v.turma.id}`}
                          acaoLabel="Abrir"
                        />
                        <DocumentoPedagogicoCard
                          icon={ScrollText}
                          cor="var(--cat-2-dot)"
                          titulo="Roteiro"
                          subtitulo="Gerado automaticamente do Planejamento"
                          href={roteiroHref}
                          external
                          acaoLabel="Baixar PDF"
                        />
                        <DocumentoPedagogicoCard
                          icon={ImageIcon}
                          cor="var(--cat-4-dot)"
                          titulo="Atividade Gráfica"
                          subtitulo={`${folhas.grafica} preenchida${folhas.grafica === 1 ? "" : "s"} esse mês`}
                          href={`/pedagogico/planejamento/${v.turma.id}`}
                          acaoLabel="Preencher"
                        />
                        <DocumentoPedagogicoCard
                          icon={BookOpen}
                          cor="var(--cat-3-dot)"
                          titulo="Tema Literário"
                          subtitulo={`${folhas.literario} preenchido${folhas.literario === 1 ? "" : "s"} esse mês`}
                          href={`/pedagogico/planejamento/${v.turma.id}`}
                          acaoLabel="Preencher"
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-cda-border pt-3">
                        <span className="text-xs text-cda-text3">Outras entregas:</span>
                        <Link
                          href={`/pedagogico/parecer/${v.turma.id}`}
                          className="inline-flex items-center gap-1 rounded-full bg-cda-blue/10 px-2.5 py-0.5 text-xs font-medium text-cda-blue hover:bg-cda-blue/20"
                        >
                          <FileText className="h-3 w-3" />
                          Parecer
                        </Link>
                        <Link
                          href={`/pedagogico/portfolio/${v.turma.id}`}
                          className="inline-flex items-center gap-1 rounded-full bg-cda-blue/10 px-2.5 py-0.5 text-xs font-medium text-cda-blue hover:bg-cda-blue/20"
                        >
                          <ImageIcon className="h-3 w-3" />
                          Portfólio
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {especialistaPorMateria.size > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-cda-text2">Como especialista</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...especialistaPorMateria.entries()].map(([materia, vs]) => (
                  <Card key={materia} className="p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-cda-amber" />
                      <span className="text-sm font-semibold text-cda-text">{materia}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {vs.map((v) => (
                        <Badge key={v.id} variant="cat5">
                          {v.turma.nome}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
