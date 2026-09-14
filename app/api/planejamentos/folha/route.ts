import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { segundaFeiraDe, type ConteudoDiaPlanejamento } from "@/lib/planejamento";
import { gerarFolhaImprimivelPdf, type TipoFolhaImprimivel } from "@/lib/gerarFolhaImprimivelPdf";
import { respostaPDF, nomeArquivoPdf } from "@/lib/gerarRelatorioPdf";

const CHAVE_POR_TIPO: Record<TipoFolhaImprimivel, keyof ConteudoDiaPlanejamento> = {
  TEMA_LITERARIO: "folhaTemaLiterario",
  ATIVIDADE_GRAFICA: "folhaAtividadeGrafica",
};

/** Gera a folha imprimível (Tema Literário / Atividade Gráfica) de um dia
 * específico do planejamento — o texto vem do que a professora já escreveu
 * naquele dia, aqui só monta o PDF pra imprimir (ver DiaPlanejamento em
 * PlanejamentoSemanalClient). Qualquer um do Pedagógico baixa, não só quem
 * edita — é só impressão. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const turmaId = req.nextUrl.searchParams.get("turmaId");
  const dataParam = req.nextUrl.searchParams.get("data");
  const tipoParam = req.nextUrl.searchParams.get("tipo");
  if (!turmaId || !dataParam || (tipoParam !== "TEMA_LITERARIO" && tipoParam !== "ATIVIDADE_GRAFICA")) {
    return NextResponse.json({ error: "Informe turmaId, data e tipo (TEMA_LITERARIO ou ATIVIDADE_GRAFICA)" }, { status: 400 });
  }
  const tipo = tipoParam as TipoFolhaImprimivel;
  const data = new Date(`${dataParam}T00:00:00.000Z`);
  if (Number.isNaN(data.getTime())) return NextResponse.json({ error: "Data inválida" }, { status: 400 });

  const turma = await prisma.turma.findUnique({ where: { id: turmaId }, select: { nome: true } });
  if (!turma) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });

  const semanaInicio = segundaFeiraDe(data);
  const planejamento = await prisma.planejamento.findUnique({
    where: { turmaId_semanaInicio: { turmaId, semanaInicio } },
    include: { dias: { where: { data } } },
  });
  const conteudo = (planejamento?.dias[0]?.conteudo ?? {}) as ConteudoDiaPlanejamento;
  const texto = conteudo[CHAVE_POR_TIPO[tipo]];
  if (!texto) return NextResponse.json({ error: "Esse dia ainda não tem texto preenchido pra essa folha" }, { status: 404 });

  const dataUri = await gerarFolhaImprimivelPdf({ tipo, turmaNome: turma.nome, texto });
  return respostaPDF(dataUri, nomeArquivoPdf(tipo === "TEMA_LITERARIO" ? "Tema Literario" : "Atividade Grafica", turma.nome));
}
