import { NextRequest, NextResponse, after } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { funcionarioId } = body;

  if (!funcionarioId) return NextResponse.json({ error: "Selecione o responsável pela retirada" }, { status: 400 });

  // Vincula a um Funcionario cadastrado em vez de aceitar nome digitado à mão —
  // evita duplicidade/erro de digitação ("matheus" vs "Matheus Proensa").
  const funcionario = await prisma.funcionario.findUnique({ where: { id: funcionarioId } });
  if (!funcionario) {
    return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 400 });
  }

  try {
    // Checagem + criação dentro da MESMA transação, em isolamento Serializable
    // (achado real da auditoria set/2026): antes eram 2 queries soltas — duas
    // pessoas na secretaria clicando "retirar" pra mesma chave quase ao mesmo
    // tempo podiam ambas passar pela checagem de "livre" antes de qualquer uma
    // criar o registro, e a chave ficava emprestada duas vezes ao mesmo tempo
    // (sem trava nenhuma no banco pra impedir isso). Serializable faz o
    // Postgres abortar uma das duas transações concorrentes com erro de
    // conflito (P2034) em vez de deixar as duas passarem.
    const emprestimo = await prisma.$transaction(
      async (tx) => {
        const emprestimoAberto = await tx.emprestimoChave.findFirst({
          where: { chaveId: id, devolucao: null },
        });
        if (emprestimoAberto) throw new Error("CHAVE_JA_EMPRESTADA");

        return tx.emprestimoChave.create({
          data: { chaveId: id, responsavel: funcionario.nome, responsavelFuncionarioId: funcionario.id },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    after(() => avisarMudanca("chaves"));
    return NextResponse.json(emprestimo, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "CHAVE_JA_EMPRESTADA") {
      return NextResponse.json({ error: "Esta chave já está emprestada" }, { status: 400 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      return NextResponse.json({ error: "Esta chave já está emprestada" }, { status: 400 });
    }
    return erroApi(err);
  }
}
