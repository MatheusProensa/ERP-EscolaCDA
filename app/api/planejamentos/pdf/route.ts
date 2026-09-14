import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { segundaFeiraDe, diasDaSemana, isoData, tipoPadraoDoDia, blocosDoDia, type ConteudoDiaPlanejamento } from "@/lib/planejamento";
import { gerarPlanejamentoPdf, type DiaPlanejamentoPdf } from "@/lib/gerarPlanejamentoPdf";
import { respostaPDF, nomeArquivoPdf } from "@/lib/gerarRelatorioPdf";
import type { TipoDiaPlanejamento } from "@prisma/client";

const LABEL_DIA = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];
const LABEL_TIPO: Record<string, string> = { TEMATICA: "Temática do dia", CONTEXTO: "Contexto organizado" };

function formatarDiaMes(data: Date): string {
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

/** Exporta o planejamento de uma semana em PDF — mesma informação da tela,
 * com o cabeçalho de marca da escola. Qualquer um do Pedagógico baixa, não
 * só quem edita (é só impressão/registro). */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const turmaId = req.nextUrl.searchParams.get("turmaId");
  const semanaParam = req.nextUrl.searchParams.get("semana");
  if (!turmaId || !semanaParam) return NextResponse.json({ error: "Informe turmaId e semana" }, { status: 400 });
  const semanaBase = new Date(`${semanaParam}T00:00:00.000Z`);
  if (Number.isNaN(semanaBase.getTime())) return NextResponse.json({ error: "Semana inválida" }, { status: 400 });
  const semanaInicio = segundaFeiraDe(semanaBase);

  const turma = await prisma.turma.findUnique({ where: { id: turmaId }, select: { nome: true } });
  if (!turma) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });

  const planejamento = await prisma.planejamento.findUnique({
    where: { turmaId_semanaInicio: { turmaId, semanaInicio } },
    include: { dias: true, projeto: { select: { nome: true } } },
  });

  const diasPorData = new Map((planejamento?.dias ?? []).map((d) => [isoData(d.data), d]));
  const dias: DiaPlanejamentoPdf[] = diasDaSemana(semanaInicio).map((data, indice) => {
    const salvo = diasPorData.get(isoData(data));
    const tipo = (salvo?.tipo ?? tipoPadraoDoDia(indice)) as TipoDiaPlanejamento;
    const conteudo = (salvo?.conteudo ?? {}) as ConteudoDiaPlanejamento;
    return {
      label: `${LABEL_DIA[indice]} — ${formatarDiaMes(data)}`,
      tipoLabel: LABEL_TIPO[tipo],
      blocos: blocosDoDia(tipo, conteudo),
      especializadas: salvo?.especializadas ?? "",
    };
  });

  const semanaLabel = `Semana de ${formatarDiaMes(semanaInicio)} a ${formatarDiaMes(diasDaSemana(semanaInicio)[4])}`;
  const dataUri = await gerarPlanejamentoPdf({
    turmaNome: turma.nome,
    semanaLabel,
    projetoNome: planejamento?.projeto?.nome ?? null,
    materiais: planejamento?.materiais ?? null,
    dias,
  });

  return respostaPDF(dataUri, nomeArquivoPdf("Planejamento", turma.nome, semanaLabel));
}
