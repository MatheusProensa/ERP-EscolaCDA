import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { diasDaSemana, isoData, tipoPadraoDoDia, blocosDoDia, semanasDoMes, type ConteudoDiaPlanejamento } from "@/lib/planejamento";
import { gerarPlanejamentoMesPdf, type DiaPlanejamentoPdf, type SemanaPlanejamentoPdf, type MomentoRotinaPdf } from "@/lib/gerarPlanejamentoPdf";
import { respostaPDF, nomeArquivoPdf } from "@/lib/gerarRelatorioPdf";
import type { TipoDiaPlanejamento } from "@prisma/client";

const LABEL_DIA = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];
const MESES_LABEL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatarDiaMes(data: Date): string {
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

/** Exporta o planejamento do MÊS INTEIRO em PDF (achado real, set/2026: o
 * documento real da escola é organizado por mês, com as semanas dentro —
 * correção do dono depois de ver o PDF sair só por semana: "é o mês
 * inteiro, é o projeto do mês inteiro"). A professora preenche semana a
 * semana na tela; aqui é onde tudo isso vira 1 PDF só. Qualquer um do
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
  const [planejamentos, momentosRotina, regente] = await Promise.all([
    prisma.planejamento.findMany({
      where: { turmaId, semanaInicio: { in: semanasIniciais } },
      include: { dias: true, projeto: { select: { nome: true, justificativa: true } } },
    }),
    prisma.momentoRotina.findMany({ where: { turmaId }, orderBy: { ordem: "asc" } }),
    prisma.vinculoPedagogico.findFirst({ where: { turmaId, papel: "REGENTE" }, select: { user: { select: { name: true } } } }),
  ]);
  const planejamentoPorSemana = new Map(planejamentos.map((p) => [isoData(p.semanaInicio), p]));
  const rotina: MomentoRotinaPdf[] = momentosRotina.map((m) => ({ nome: m.nome, descricao: m.descricao }));

  const semanas: SemanaPlanejamentoPdf[] = semanasIniciais.map((semanaInicio, indiceSemana) => {
    const planejamento = planejamentoPorSemana.get(isoData(semanaInicio));
    const diasPorData = new Map((planejamento?.dias ?? []).map((d) => [isoData(d.data), d]));
    const dias: DiaPlanejamentoPdf[] = diasDaSemana(semanaInicio).map((data, indice) => {
      const salvo = diasPorData.get(isoData(data));
      const tipo = (salvo?.tipo ?? tipoPadraoDoDia(indice)) as TipoDiaPlanejamento;
      const conteudo = (salvo?.conteudo ?? {}) as ConteudoDiaPlanejamento;
      // Formato igual ao documento real (achado real, set/2026: "Segunda-feira
      // – xx/xx:", com travessão curto e dois-pontos no final).
      return {
        label: `${LABEL_DIA[indice]} – ${formatarDiaMes(data)}:`,
        blocos: blocosDoDia(tipo, conteudo),
        especializadas: salvo?.especializadas ?? "",
      };
    });
    return {
      // "1ª SEMANA (dd/mm a dd/mm)" — formato exato do documento real, não
      // "Semana de... a..." (achado real, comparação lado a lado com o Word).
      semanaLabel: `${indiceSemana + 1}ª semana (${formatarDiaMes(semanaInicio)} a ${formatarDiaMes(diasDaSemana(semanaInicio)[4])})`,
      projetoNome: planejamento?.projeto?.nome ?? null,
      projetoJustificativa: planejamento?.projeto?.justificativa ?? null,
      materiais: planejamento?.materiais ?? null,
      tardeCulturalApresentacao: planejamento?.tardeCulturalApresentacao ?? null,
      tardeCulturalMateriais: planejamento?.tardeCulturalMateriais ?? null,
      dias,
    };
  });

  const mesLabel = `${MESES_LABEL[mes - 1]} de ${ano}`;
  const dataUri = await gerarPlanejamentoMesPdf({
    turmaNome: turma.nome,
    professoraNome: regente?.user.name ?? "",
    mesLabel,
    rotina,
    semanas,
  });

  return respostaPDF(dataUri, nomeArquivoPdf("Planejamento", turma.nome, mesLabel));
}
