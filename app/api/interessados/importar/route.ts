import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { construirNovos, detectarColunas, parsarPlanilha, validarPlanilhaDataUri } from "@/lib/importarInteressados";

/** Pré-visualização da importação de Interessados: lê a planilha e monta a
 * lista de propostas de criação (avisando possíveis duplicatas) — não grava
 * nada no banco. Mesmo padrão dos importadores de Alunos/Funcionários.
 * Confirmação de verdade é em /api/interessados/importar/confirmar. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = await req.json();
    const validacao = validarPlanilhaDataUri(body?.arquivo);
    if (!validacao.ok) return NextResponse.json({ error: validacao.erro }, { status: 400 });

    const { headers, linhas } = await parsarPlanilha(validacao.buffer);
    if (headers.length === 0 || linhas.length === 0) {
      return NextResponse.json({ error: "Não encontrei dados na planilha (confira se a primeira linha tem os títulos das colunas)." }, { status: 400 });
    }

    const colunas = detectarColunas(headers);
    if (!colunas.nomeCrianca) {
      return NextResponse.json(
        { error: "Não encontrei uma coluna com o nome da criança — renomeie a coluna pra algo como \"Criança\" ou \"Nome\"." },
        { status: 400 }
      );
    }

    const [interessadosDb, turmas] = await Promise.all([
      prisma.listaEspera.findMany({ select: { nomeCrianca: true, nomeResponsavel: true } }),
      prisma.turma.findMany({ select: { id: true, nome: true } }),
    ]);

    const { novos, ignorados } = construirNovos(interessadosDb, turmas, linhas, colunas);

    return NextResponse.json({ headers, colunas, totalLinhas: linhas.length, novos, ignorados });
  } catch (err) {
    return erroApi(err);
  }
}
