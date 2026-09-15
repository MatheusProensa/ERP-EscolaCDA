import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Sparkles, CalendarClock, ScrollText, Printer } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { hojeBrasilia } from "@/lib/utils";
import { PlanejamentoTabs } from "@/components/modules/pedagogico/PlanejamentoTabs";
import {
  segundaFeiraDe,
  diasDaSemana,
  isoData,
  tipoPadraoDoDia,
  tituloDoDia,
  bulletsDoDia,
  semanasDoMes,
  type ConteudoDiaPlanejamento,
} from "@/lib/planejamento";

const LABEL_DIA = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];
const LABEL_TIPO: Record<string, string> = { TEMATICA: "Temática do dia", CONTEXTO: "Contexto organizado" };

function formatarDiaMes(iso: string): string {
  const data = new Date(`${iso}T00:00:00.000Z`);
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

function somarDias(iso: string, dias: number): string {
  const data = new Date(`${iso}T00:00:00.000Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

/** Roteiro — versão resumida do planejamento da semana, em bullets em vez de
 * parágrafo cheio (achado real, set/2026: documento MODELO_ROTEIRO_CDA).
 * Só leitura, GERADA a partir do que já foi salvo no Planejamento — nada é
 * digitado de novo aqui. */
export default async function RoteiroTurmaPage({
  params,
  searchParams,
}: {
  params: Promise<{ turmaId: string }>;
  searchParams: Promise<{ semana?: string }>;
}) {
  const { turmaId } = await params;
  const { semana: semanaParam } = await searchParams;

  const turma = await prisma.turma.findUnique({ where: { id: turmaId }, select: { id: true, nome: true } });
  if (!turma) notFound();

  const semanaBase = semanaParam ? new Date(`${semanaParam}T00:00:00.000Z`) : hojeBrasilia();
  const semanaInicio = segundaFeiraDe(Number.isNaN(semanaBase.getTime()) ? hojeBrasilia() : semanaBase);
  const semanaIso = isoData(semanaInicio);
  const anoMes = `${semanaInicio.getUTCFullYear()}-${String(semanaInicio.getUTCMonth() + 1).padStart(2, "0")}`;
  const semanasMesAtual = semanasDoMes(hojeBrasilia());

  const [planejamento, horarios, semanasEnviadas] = await Promise.all([
    prisma.planejamento.findUnique({
      where: { turmaId_semanaInicio: { turmaId, semanaInicio } },
      include: { dias: true, projeto: true },
    }),
    prisma.horarioEspecializada.findMany({ where: { turmaId } }),
    // Só pro ✓ verde da aba (mockup do Gemini) — mesmo sinal usado na página
    // do Planejamento, Roteiro é gerado dele, compartilham a completude.
    prisma.planejamento.count({
      where: { turmaId, semanaInicio: { in: semanasMesAtual }, status: { in: ["ENVIADO", "APROVADO", "DEVOLVIDO"] } },
    }),
  ]);
  const mesCompleto = semanasEnviadas >= semanasMesAtual.length;

  const diasPorData = new Map((planejamento?.dias ?? []).map((d) => [isoData(d.data), d]));
  const horarioPorDiaSemana = new Map(horarios.map((h) => [h.diaSemana, h.texto]));
  const dias = diasDaSemana(semanaInicio).map((data, indice) => {
    const salvo = diasPorData.get(isoData(data));
    const tipo = salvo?.tipo ?? tipoPadraoDoDia(indice);
    const conteudo = (salvo?.conteudo ?? {}) as ConteudoDiaPlanejamento;
    return {
      data: isoData(data),
      tipo,
      titulo: tituloDoDia(tipo, conteudo),
      bullets: bulletsDoDia(tipo, conteudo),
      especializadas: salvo?.especializadas ?? horarioPorDiaSemana.get(indice) ?? "",
    };
  });

  const temConteudo = dias.some((d) => d.titulo || d.bullets.length > 0);

  return (
    <div>
      <PageHeader
        title={`Roteiro — ${turma.nome}`}
        subtitle="Resumo em bullets do que já foi preenchido no Planejamento — gerado sozinho, não precisa digitar de novo."
        breadcrumb={[
          { label: "Pedagógico", href: "/pedagogico" },
          { label: turma.nome, href: `/pedagogico/planejamento/${turma.id}` },
          { label: "Roteiro" },
        ]}
      />
      <PlanejamentoTabs turmaId={turma.id} active="roteiro" completos={{ planejamento: mesCompleto, roteiro: mesCompleto }} />

      <div className="mb-2 flex items-center justify-between gap-3">
        <Link
          href={`/pedagogico/planejamento/${turma.id}/roteiro?semana=${somarDias(semanaIso, -7)}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-cda-border text-cda-text2 hover:bg-cda-bg"
          aria-label="Semana anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm font-semibold text-cda-text">
          Semana de {formatarDiaMes(semanaIso)} a {formatarDiaMes(somarDias(semanaIso, 4))}
        </span>
        <Link
          href={`/pedagogico/planejamento/${turma.id}/roteiro?semana=${somarDias(semanaIso, 7)}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-cda-border text-cda-text2 hover:bg-cda-bg"
          aria-label="Próxima semana"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <a
        href={`/api/planejamentos/roteiro-pdf?turmaId=${turma.id}&mes=${anoMes}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-cda-blue hover:underline"
      >
        <Printer className="h-3.5 w-3.5" />
        Baixar PDF do Roteiro (mês inteiro)
      </a>

      {planejamento?.projeto && (
        <Card
          className="mb-5"
          title={
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cda-blue" />
              {planejamento.projeto.nome}
            </div>
          }
        >
          {planejamento.projeto.justificativa && (
            <p className="whitespace-pre-line px-5 py-4 text-sm text-cda-text2">{planejamento.projeto.justificativa}</p>
          )}
        </Card>
      )}

      {planejamento?.materiais && (
        <Card className="mb-5">
          <div className="flex flex-wrap items-start gap-2 px-5 py-3">
            <Badge variant="cat2">Materiais</Badge>
            <p className="flex-1 text-sm text-cda-text2">{planejamento.materiais}</p>
          </div>
        </Card>
      )}

      {!temConteudo ? (
        <Card>
          <EmptyState
            icon={ScrollText}
            title="Essa semana ainda não tem planejamento preenchido"
            subtitle="O roteiro é gerado a partir do que a regente já salvou no Planejamento — assim que preencher, aparece aqui."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {dias.map((dia, i) => (
            <Card key={dia.data} className="flex flex-col p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-cda-text">{LABEL_DIA[i]}</p>
                <span className="text-xs text-cda-text3">{formatarDiaMes(dia.data)}</span>
              </div>
              <Badge variant="cat5" className="mb-2 self-start">
                {LABEL_TIPO[dia.tipo]}
              </Badge>
              {dia.titulo && <p className="mb-2 text-sm font-medium text-cda-text">{dia.titulo}</p>}
              {dia.bullets.length > 0 && (
                <ul className="mb-3 flex flex-col gap-1.5">
                  {dia.bullets.map((b, idx) => (
                    <li key={idx} className="flex gap-1.5 text-xs text-cda-text2">
                      <span className="text-cda-text3">•</span>
                      <span className="whitespace-pre-line">{b}</span>
                    </li>
                  ))}
                </ul>
              )}
              {dia.especializadas && (
                <div className="mt-auto flex items-start gap-1.5 border-t border-cda-border pt-2">
                  <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cda-text3" />
                  <p className="whitespace-pre-line text-xs text-cda-text3">{dia.especializadas}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
