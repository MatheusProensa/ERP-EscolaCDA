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
  Printer,
  ArrowUpRight,
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
import { BarraFiltro } from "@/components/ui/BarraFiltro";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { hojeBrasilia, ordenarTurmas } from "@/lib/utils";
import { semanasDoMes } from "@/lib/planejamento";

const TURNO_LABEL: Record<string, string> = { MANHA: "Manhã", TARDE: "Tarde" };

/** Hub da professora dentro da Área Pedagógica — mostra o vínculo dela
 * (turma como regente, matéria×turmas como especialista) e leva pras 3
 * entregas (planejamento, parecer, portfólio), todas já reais (task #18). */
export default async function PedagogicoPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; atrasados?: string }>;
}) {
  const { busca, atrasados } = await searchParams;
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
    select: { turmaId: true, status: true },
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
  // set/2026: "coordenadora define o prazo do mês").
  function statusExibicao(turmaId: string): "APROVADO" | "DEVOLVIDO" | "ENVIADO" | "ATRASADO" | "PENDENTE" {
    const s = statusPorTurma.get(turmaId);
    if (!s || s.total < semanasMes.length) return prazoVencido ? "ATRASADO" : "PENDENTE";
    if (s.devolvidas > 0) return "DEVOLVIDO";
    if (s.aprovadas >= semanasMes.length) return "APROVADO";
    return "ENVIADO";
  }
  const STATUS_LABEL: Record<string, string> = {
    APROVADO: "Aprovado",
    DEVOLVIDO: "Devolvido",
    ENVIADO: "Aguardando revisão",
    ATRASADO: "Atrasado",
    PENDENTE: "Pendente",
  };
  const STATUS_BADGE: Record<string, "success" | "danger" | "info" | "warning" | "critical"> = {
    APROVADO: "success",
    DEVOLVIDO: "danger",
    ENVIADO: "info",
    ATRASADO: "critical",
    PENDENTE: "warning",
  };
  const EMPHASIS_STATUS: Record<string, "brand" | "warning" | "danger" | undefined> = {
    APROVADO: undefined,
    ENVIADO: undefined,
    DEVOLVIDO: "danger",
    ATRASADO: "danger",
    PENDENTE: "warning",
  };

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
  function textoPrazo(): string | null {
    if (!dataLimite) return null;
    const diffDias = Math.round((dataLimite.getTime() - hoje.getTime()) / 86400000);
    if (diffDias < 0) return `Prazo vencido há ${Math.abs(diffDias)} dia${Math.abs(diffDias) === 1 ? "" : "s"}`;
    if (diffDias === 0) return "Prazo é hoje";
    return `${diffDias} dia${diffDias === 1 ? "" : "s"} até o prazo`;
  }

  // Coordenadora vê TODAS as turmas do ano letivo ativo, com a regente e o
  // status do mês — é o "dashboard bem bom pra acompanhar as professoras"
  // pedido desde o início.
  const todasTurmas = souCoordenadora && anoLetivo
    ? ordenarTurmas(
        await prisma.turma.findMany({
          where: { anoLetivoId: anoLetivo.id },
          include: { vinculosPedagogico: { where: { papel: "REGENTE" }, include: { user: { select: { name: true } } } } },
        })
      )
    : [];

  // Busca por turma/professora + filtro "só atrasados" (pedido do dono:
  // "filtro só atrasados com 1 clique" + "busca rápida por nome de
  // professora ou turma") — só filtra a LISTA, os cards de resumo acima
  // continuam mostrando o total real do ano letivo, filtro nenhum.
  const buscaNormalizada = (busca ?? "").trim().toLowerCase();
  const soAtrasados = atrasados === "1";
  const turmasFiltradas = todasTurmas.filter((t) => {
    if (soAtrasados && statusExibicao(t.id) !== "ATRASADO") return false;
    if (buscaNormalizada) {
      const regenteNome = t.vinculosPedagogico[0]?.user.name ?? "";
      const alvo = `${t.nome} ${regenteNome}`.toLowerCase();
      if (!alvo.includes(buscaNormalizada)) return false;
    }
    return true;
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
          <div className="mb-3 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <MetricCard icon={Users} tone="cat1" value={todasTurmas.length} label="Turmas" subtext="Ano letivo atual" />
            <MetricCard
              icon={CheckCircle2}
              tone="success"
              value={entreguesMesAtual.size}
              label="Entregaram esse mês"
              subtext="Planejamento em dia"
            />
            <MetricCard
              icon={ClipboardCheck}
              tone="cat5"
              value={todasTurmas.filter((t) => statusExibicao(t.id) === "ENVIADO").length}
              label="Aguardando revisão"
              subtext="Enviado, ainda não revisado"
            />
            <MetricCard
              icon={Clock}
              tone={prazoVencido ? "critical" : "warning"}
              value={Math.max(0, todasTurmas.length - entreguesMesAtual.size)}
              label={prazoVencido ? "Atrasadas" : "Ainda pendentes"}
              subtext={prazoVencido ? "Passou do prazo do mês" : "Planejamento desse mês"}
            />
          </div>
          <BarraFiltro
            buscaParam="busca"
            buscaPlaceholder="Buscar turma ou professora..."
            checkboxes={[{ paramName: "atrasados", value: "1", label: "Só atrasadas" }]}
            total={turmasFiltradas.length}
            totalGeral={todasTurmas.length}
          />
          <Card
            title={
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-cda-blue" />
                Planejamento do mês — todas as turmas
              </div>
            }
          >
            {turmasFiltradas.length === 0 && (
              <p className="px-5 py-6 text-center text-sm text-cda-text3">Nenhuma turma encontrada com esse filtro.</p>
            )}
            {(["TARDE", "MANHA"] as const).map((turno) => {
              const turmasDoTurno = turmasFiltradas.filter((t) => t.turno === turno);
              if (turmasDoTurno.length === 0) return null;
              return (
                <div key={turno}>
                  <p className="border-b border-t border-cda-border bg-cda-bg px-5 py-1.5 text-xs font-semibold uppercase tracking-wide text-cda-text3 first:border-t-0">
                    {TURNO_LABEL[turno]}
                  </p>
                  <div className="flex flex-col divide-y divide-cda-border">
                    {turmasDoTurno.map((turma) => {
                      const regente = turma.vinculosPedagogico[0]?.user.name;
                      const statusTurma = statusExibicao(turma.id);
                      return (
                        <div key={turma.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                          <div>
                            <Link href={`/pedagogico/planejamento/${turma.id}`} className="text-sm font-medium text-cda-text hover:text-cda-blue hover:underline">
                              {turma.nome}
                            </Link>
                            <span className="ml-2 text-xs text-cda-text3">{regente ? `Regente: ${regente}` : "Sem regente vinculada"}</span>
                          </div>
                          <Badge variant={STATUS_BADGE[statusTurma]}>{STATUS_LABEL[statusTurma]}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </Card>
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
                        <Card emphasis={EMPHASIS_STATUS[statusTurma]} className="flex flex-col gap-2 p-3">
                          <div className="flex items-center gap-1.5">
                            <NotebookPen className="h-3.5 w-3.5 text-cda-blue" />
                            <span className="text-xs font-semibold text-cda-text">Planejamento</span>
                          </div>
                          <Badge variant={STATUS_BADGE[statusTurma]} className="self-start">
                            {STATUS_LABEL[statusTurma]}
                          </Badge>
                          <Link href={`/pedagogico/planejamento/${v.turma.id}`} className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-cda-blue hover:underline">
                            Abrir <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </Card>

                        <Card className="flex flex-col gap-2 p-3">
                          <div className="flex items-center gap-1.5">
                            <ScrollText className="h-3.5 w-3.5 text-cda-text3" />
                            <span className="text-xs font-semibold text-cda-text">Roteiro</span>
                          </div>
                          <span className="text-xs text-cda-text3">Gerado automaticamente do Planejamento</span>
                          <a href={roteiroHref} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-cda-blue hover:underline">
                            <Printer className="h-3 w-3" /> Baixar PDF do mês
                          </a>
                        </Card>

                        <Card className="flex flex-col gap-2 p-3">
                          <div className="flex items-center gap-1.5">
                            <ImageIcon className="h-3.5 w-3.5 text-cda-text3" />
                            <span className="text-xs font-semibold text-cda-text">Atividade Gráfica</span>
                          </div>
                          <span className="text-xs text-cda-text3">{folhas.grafica} preenchida{folhas.grafica === 1 ? "" : "s"} esse mês</span>
                          <Link href={`/pedagogico/planejamento/${v.turma.id}`} className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-cda-blue hover:underline">
                            Preencher no dia <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </Card>

                        <Card className="flex flex-col gap-2 p-3">
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5 text-cda-text3" />
                            <span className="text-xs font-semibold text-cda-text">Tema Literário</span>
                          </div>
                          <span className="text-xs text-cda-text3">{folhas.literario} preenchido{folhas.literario === 1 ? "" : "s"} esse mês</span>
                          <Link href={`/pedagogico/planejamento/${v.turma.id}`} className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-cda-blue hover:underline">
                            Preencher no dia <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </Card>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-cda-border pt-3">
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
