import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { construirDiffs, detectarColunas, parsarPlanilha, validarPlanilhaDataUri } from "@/lib/importarAlunos";

/** Pré-visualização da importação: lê a planilha, casa com os alunos já
 * cadastrados e devolve as diferenças propostas — não grava nada no banco.
 * A confirmação de verdade é em /api/alunos/importar/confirmar. */
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
    if (!colunas.nome) {
      return NextResponse.json(
        { error: "Não encontrei uma coluna com o nome do aluno — renomeie a coluna pra algo como \"Nome\" ou \"Aluno\"." },
        { status: 400 }
      );
    }

    const anoLetivo = await getAnoLetivoAtivo();
    const alunosDb = await prisma.aluno.findMany({
      select: {
        id: true,
        nome: true,
        matriculas: {
          where: { anoLetivoId: anoLetivo?.id },
          select: { id: true, situacao: true, valorMensalidade: true, turma: { select: { nome: true } } },
        },
        responsaveis: { select: { id: true, telefone: true, cpf: true, endereco: true, email: true } },
      },
    });

    const { diffs, naoEncontrados, ambiguos } = construirDiffs(alunosDb, linhas, colunas);

    return NextResponse.json({
      headers,
      colunas,
      totalLinhas: linhas.length,
      diffs,
      naoEncontrados,
      ambiguos,
    });
  } catch (err) {
    return erroApi(err);
  }
}
