import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  diasDaSemana,
  isoData,
  tipoPadraoDoDia,
  tituloDoDia,
  bulletsDoDia,
  semanasDoMes,
  type ConteudoDiaPlanejamento,
} from "@/lib/planejamento";
import { gerarRoteiroMesPdf, type RoteiroDiaPdf, type RoteiroSemanaPdf } from "@/lib/gerarRoteiroPdf";
import { respostaPDF, nomeArquivoPdf } from "@/lib/gerarRelatorioPdf";
import type { TipoDiaPlanejamento } from "@prisma/client";

const LABEL_DIA = ["SEGUNDA-FEIRA", "TERÇA-FEIRA", "QUARTA-FEIRA", "QUINTA-FEIRA", "SEXTA-FEIRA"];
const MESES_LABEL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatarDiaMes(data: Date): string {
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

/** Exporta o Roteiro de Vivências Pedagógicas do MÊS INTEIRO em PDF — tabela
 * horizontal com os 5 dias em colunas (achado real, set/2026, documento
 * MODELO_ROTEIRO_CDA). É o resumo do Planejamento (mesmos dados, gerado
 * automaticamente, sem a professora digitar de novo). Qualquer um do
 * Pedagógico baixa, não só quem edita. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const turmaId = req.nextUrl.searchParams.get("turmaId");
  const mesParam = req.nextUrl.searchParams.get("mes"); // "YYYY-MM"
  if (!turmaId || !mesParam || !/^\d{4}-\d{2}$/.test(mesParam)) {
    return NextResponse.json({ error: "Informe turmaId e mes (YYYY-MM)" }, { status: 400 });
  }
  const [ano, mes] = mesParam.split("-").map(Number);
  const referencia = new Date(Date.UTC(ano, mes - 1, 15));

  const turma = await prisma.turma.findUnique({ where: { id: turmaId }, select: { nome: true } });
  if (!turma) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });

  const semanasIniciais = semanasDoMes(referencia);
  const [planejamentos, regente, projetoAtivo] = await Promise.all([
    prisma.planejamento.findMany({
      where: { turmaId, semanaInicio: { in: semanasIniciais } },
      include: { dias: true, projeto: { select: { nome: true, justificativa: true } } },
    }),
    prisma.vinculoPedagogico.findFirst({ where: { turmaId, papel: "REGENTE" }, select: { user: { select: { name: true } } } }),
    prisma.projetoPedagogico.findFirst({ where: { turmaId, ativo: true }, select: { nome: true, justificativa: true } }),
  ]);
  const planejamentoPorSemana = new Map(planejamentos.map((p) => [isoData(p.semanaInicio), p]));

  // Tema do Projeto + Justificativa aparecem 1 vez no topo do documento real
  // (não por semana) — usa o projeto da 1ª semana que tiver um escolhido, ou
  // o ativo da turma quando nenhuma semana ainda escolheu.
  const projetoDoMes = planejamentos.find((p) => p.projeto)?.projeto ?? projetoAtivo;

  const semanas: RoteiroSemanaPdf[] = semanasIniciais.map((semanaInicio) => {
    const planejamento = planejamentoPorSemana.get(isoData(semanaInicio));
    const diasPorData = new Map((planejamento?.dias ?? []).map((d) => [isoData(d.data), d]));
    const dias: RoteiroDiaPdf[] = diasDaSemana(semanaInicio).map((data, indice) => {
      const salvo = diasPorData.get(isoData(data));
      const tipo = (salvo?.tipo ?? tipoPadraoDoDia(indice)) as TipoDiaPlanejamento;
      const conteudo = (salvo?.conteudo ?? {}) as ConteudoDiaPlanejamento;
      return {
        diaLabel: `${LABEL_DIA[indice]} — ${formatarDiaMes(data)}`,
        tematica: tituloDoDia(tipo, conteudo),
        vivencias: bulletsDoDia(tipo, conteudo),
        especializadas: salvo?.especializadas ?? "",
      };
    });
    return {
      semanaLabel: `Semana de ${formatarDiaMes(semanaInicio)} a ${formatarDiaMes(diasDaSemana(semanaInicio)[4])}`,
      materiais: planejamento?.materiais ?? null,
      dias,
    };
  });

  const mesLabel = `${MESES_LABEL[mes - 1]} de ${ano}`;
  const dataUri = await gerarRoteiroMesPdf({
    turmaNome: turma.nome,
    professoraNome: regente?.user.name ?? "",
    mesLabel,
    projetoNome: projetoDoMes?.nome ?? null,
    projetoJustificativa: projetoDoMes?.justificativa ?? null,
    semanas,
  });

  return respostaPDF(dataUri, nomeArquivoPdf("Roteiro de Vivencias", turma.nome, mesLabel));
}
