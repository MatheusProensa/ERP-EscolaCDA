import Link from "next/link";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { EscutaAoVivo } from "@/components/ui/EscutaAoVivo";
import { FilaImpressaoClient, type TurmaImpressao } from "@/components/modules/impressao/FilaImpressaoClient";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { hojeBrasilia, ordenarTurmas } from "@/lib/utils";
import { semanasDoMes } from "@/lib/planejamento";

const MESES_LONGO = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type LinhaStatus = { status: string; comentarioEm: Date | null; impresso: boolean; impressoEm: Date | null; impressoPor: string | null };

/** Combina as semanas do mês de 1 documento (Planejamento/Roteiro/Atividade
 * Gráfica/Tema Literário) num item só da Fila de Impressão — pedido do dono,
 * out/2026: "após a coordenadora aprovar, o documento entra na fila". Só
 * entra pra imprimir quando TODAS as semanas do mês desse documento estão
 * APROVADO (mesma regra de "entregue" já usada no hub da professora) — sem
 * isso, "aprovado" ficaria fingindo que uma semana só representa o mês
 * inteiro. impresso/impressoEm/impressoPor vêm do mesmo critério (todas as
 * semanas marcadas), refletindo o dado real de cada linha do banco. */
function agregarDocumento(linhas: LinhaStatus[]) {
  if (linhas.length === 0) {
    return { aprovado: false, aprovadoEm: null as string | null, impresso: false, impressoEm: null as string | null, impressoPor: null as string | null };
  }
  const aprovado = linhas.every((l) => l.status === "APROVADO");
  const aprovadoEm = linhas.reduce<Date | null>((max, l) => (l.comentarioEm && (!max || l.comentarioEm > max) ? l.comentarioEm : max), null);
  const impresso = aprovado && linhas.every((l) => l.impresso);
  let impressoMax: Date | null = null;
  let impressoPor: string | null = null;
  for (const l of linhas) {
    if (l.impressoEm && (!impressoMax || l.impressoEm > impressoMax)) {
      impressoMax = l.impressoEm;
      impressoPor = l.impressoPor;
    }
  }
  return { aprovado, aprovadoEm: aprovadoEm?.toISOString() ?? null, impresso, impressoEm: impressoMax?.toISOString() ?? null, impressoPor };
}

export default async function ImpressaoPage({ searchParams }: { searchParams: Promise<{ ano?: string; mes?: string }> }) {
  const { ano: anoParam, mes: mesParam } = await searchParams;
  const hoje = hojeBrasilia();
  const ano = Number(anoParam) || hoje.getUTCFullYear();
  const mes = Number(mesParam) || hoje.getUTCMonth() + 1; // 1-12
  const anoMes = `${ano}-${String(mes).padStart(2, "0")}`;
  const semanasMes = semanasDoMes(new Date(Date.UTC(ano, mes - 1, 15)));

  const anoLetivo = await getAnoLetivoAtivo();
  const todasTurmas = anoLetivo
    ? ordenarTurmas(
        await prisma.turma.findMany({
          where: { anoLetivoId: anoLetivo.id },
          include: { vinculosPedagogico: { where: { papel: "REGENTE" }, include: { user: { select: { name: true } } } } },
        })
      )
    : [];
  const turmaIds = todasTurmas.map((t) => t.id);

  const [planejamentos, folhas, observacoes] = await Promise.all([
    turmaIds.length
      ? prisma.planejamento.findMany({
          where: { turmaId: { in: turmaIds }, semanaInicio: { in: semanasMes } },
          select: {
            turmaId: true,
            status: true,
            comentarioEm: true,
            impresso: true,
            impressoEm: true,
            impressoPor: true,
            roteiroImpresso: true,
            roteiroImpressoEm: true,
            roteiroImpressoPor: true,
          },
        })
      : Promise.resolve([]),
    turmaIds.length
      ? prisma.folhaMensal.findMany({
          where: { turmaId: { in: turmaIds }, semanaInicio: { in: semanasMes } },
          select: { turmaId: true, tipo: true, status: true, comentarioEm: true, impresso: true, impressoEm: true, impressoPor: true },
        })
      : Promise.resolve([]),
    turmaIds.length ? prisma.observacaoImpressao.findMany({ where: { turmaId: { in: turmaIds }, anoMes } }) : Promise.resolve([]),
  ]);

  const observacaoPorTurma = new Map(observacoes.map((o) => [o.turmaId, o.texto]));

  const turmasResumo: TurmaImpressao[] = todasTurmas.map((t) => {
    const linhasPlanejamento = planejamentos.filter((p) => p.turmaId === t.id);
    const linhasGrafica = folhas.filter((f) => f.turmaId === t.id && f.tipo === "ATIVIDADE_GRAFICA");
    const linhasLiterario = folhas.filter((f) => f.turmaId === t.id && f.tipo === "TEMA_LITERARIO");

    const aggPlanejamento = agregarDocumento(
      linhasPlanejamento.map((p) => ({ status: p.status, comentarioEm: p.comentarioEm, impresso: p.impresso, impressoEm: p.impressoEm, impressoPor: p.impressoPor }))
    );
    // Roteiro não tem registro próprio — é PDF gerado a partir do mesmo
    // Planejamento da semana (mesmo sinal de aprovação), mas é impresso como
    // documento físico separado — daí os campos roteiroImpresso* à parte.
    const aggRoteiro = agregarDocumento(
      linhasPlanejamento.map((p) => ({ status: p.status, comentarioEm: p.comentarioEm, impresso: p.roteiroImpresso, impressoEm: p.roteiroImpressoEm, impressoPor: p.roteiroImpressoPor }))
    );
    const aggGrafica = agregarDocumento(
      linhasGrafica.map((f) => ({ status: f.status, comentarioEm: f.comentarioEm, impresso: f.impresso, impressoEm: f.impressoEm, impressoPor: f.impressoPor }))
    );
    const aggLiterario = agregarDocumento(
      linhasLiterario.map((f) => ({ status: f.status, comentarioEm: f.comentarioEm, impresso: f.impresso, impressoEm: f.impressoEm, impressoPor: f.impressoPor }))
    );

    return {
      id: t.id,
      nome: t.nome,
      turno: t.turno,
      regenteNome: t.vinculosPedagogico[0]?.user.name ?? null,
      observacao: observacaoPorTurma.get(t.id) ?? "",
      itens: [
        { tipo: "PLANEJAMENTO", label: "Planejamento", ...aggPlanejamento, pdfHref: `/api/planejamentos/pdf?turmaId=${t.id}&mes=${anoMes}`, pdfLabel: "Baixar PDF", pdfExternal: true },
        { tipo: "ROTEIRO", label: "Roteiro", ...aggRoteiro, pdfHref: `/api/planejamentos/roteiro-pdf?turmaId=${t.id}&mes=${anoMes}`, pdfLabel: "Baixar PDF", pdfExternal: true },
        { tipo: "ATIVIDADE_GRAFICA", label: "Atividade Gráfica", ...aggGrafica, pdfHref: `/pedagogico/planejamento/${t.id}/atividade-grafica`, pdfLabel: "Abrir", pdfExternal: false },
        { tipo: "TEMA_LITERARIO", label: "Tema Literário", ...aggLiterario, pdfHref: `/pedagogico/planejamento/${t.id}/tema-literario`, pdfLabel: "Abrir", pdfExternal: false },
      ],
    };
  });

  const todosItens = turmasResumo.flatMap((t) => t.itens);
  const itensAprovados = todosItens.filter((i) => i.aprovado).length;
  const itensImpressos = todosItens.filter((i) => i.aprovado && i.impresso).length;
  const turmasCompletas = turmasResumo.filter((t) => t.itens.every((i) => i.aprovado && i.impresso)).length;
  const aguardandoAprovacao = todosItens.filter((i) => !i.aprovado).length;

  const mesAnterior = mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 };
  const mesProximo = mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 };

  return (
    <div>
      <EscutaAoVivo modulo="impressao" />
      <PageHeader
        title="Fila de Impressão"
        subtitle={`Documentos aprovados aguardando impressão · ${MESES_LONGO[mes - 1]} ${ano}`}
        action={
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: "color-mix(in srgb, var(--cda-amber) 15%, transparent)", color: "var(--cda-amber)" }}
          >
            <Printer className="h-3.5 w-3.5" />
            {itensImpressos} de {itensAprovados} documentos impressos
          </span>
        }
      />

      <div className="mb-5 flex items-center justify-center gap-4">
        <Link href={`/impressao?ano=${mesAnterior.ano}&mes=${mesAnterior.mes}`} className="rounded-lg p-1.5 text-cda-text3 hover:bg-cda-bg hover:text-cda-text">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm font-semibold text-cda-text">
          {MESES_LONGO[mes - 1]} {ano}
        </span>
        <Link href={`/impressao?ano=${mesProximo.ano}&mes=${mesProximo.mes}`} className="rounded-lg p-1.5 text-cda-text3 hover:bg-cda-bg hover:text-cda-text">
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <FilaImpressaoClient
        turmas={turmasResumo}
        anoMes={anoMes}
        turmasCompletas={turmasCompletas}
        totalTurmas={turmasResumo.length}
        documentosImpressos={itensImpressos}
        documentosAprovados={itensAprovados}
        aguardandoAprovacao={aguardandoAprovacao}
      />
    </div>
  );
}
