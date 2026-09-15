import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { construirItens, detectarColunas, parsarPlanilha, validarPlanilhaDataUri } from "@/lib/importarFuncionarios";

/** Pré-visualização da importação de Funcionários: lê a planilha, casa por
 * CPF com quem já está cadastrado (diff de atualização) e propõe criar quem
 * não bate com ninguém — não grava nada no banco. Mesmo padrão do
 * importador de Alunos (lib/importarAlunos.ts). Confirmação de verdade é em
 * /api/funcionarios/importar/confirmar. */
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
        { error: "Não encontrei uma coluna com o nome do funcionário — renomeie a coluna pra algo como \"Nome\"." },
        { status: 400 }
      );
    }

    const funcionariosDb = await prisma.funcionario.findMany({
      select: { id: true, nome: true, cpf: true, cargo: true, setor: true, telefone: true, email: true, dataNascimento: true, admissao: true },
    });

    const { itens, incompletos } = construirItens(funcionariosDb, linhas, colunas);

    return NextResponse.json({ headers, colunas, totalLinhas: linhas.length, itens, incompletos });
  } catch (err) {
    return erroApi(err);
  }
}
