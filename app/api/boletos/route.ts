import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { registrarBoleto } from "@/lib/banrisul";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const alunoId = searchParams.get("alunoId") || undefined;
  const competencia = searchParams.get("competencia") || undefined;
  const status = searchParams.get("status") || undefined;

  const boletos = await prisma.boleto.findMany({
    where: {
      alunoId,
      competencia: competencia || undefined,
      status: (status as never) || undefined,
    },
    include: { aluno: { select: { id: true, nome: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(boletos);
}

// Cria o registro do boleto e já tenta registrar na API do Banrisul na hora —
// enquanto a API não estiver configurada (ver lib/banrisul.ts), fica salvo como
// PENDENTE com o motivo do erro, sem travar o lançamento: dá pra tentar de novo
// depois em /[id].
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { alunoId, competencia, valor, vencimento } = body;

  if (!alunoId || !competencia || !valor || !vencimento) {
    return NextResponse.json({ error: "Aluno, competência, valor e vencimento são obrigatórios" }, { status: 400 });
  }

  const valorNum = Number(valor);
  if (!Number.isFinite(valorNum) || valorNum <= 0) {
    return NextResponse.json({ error: "Valor precisa ser um número maior que zero" }, { status: 400 });
  }

  const aluno = await prisma.aluno.findUnique({
    where: { id: alunoId },
    include: { responsaveis: true },
  });
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  const responsavel = aluno.responsaveis[0];

  try {
    const boleto = await prisma.boleto.create({
      data: {
        alunoId,
        competencia,
        valor: valorNum,
        vencimento: new Date(vencimento),
        usuario: session.user.name ?? "Usuário",
      },
    });

    const resultado = await registrarBoleto({
      pagadorNome: responsavel?.nome ?? aluno.nome,
      pagadorCpf: responsavel?.cpf ?? null,
      competencia: boleto.competencia,
      valor: boleto.valor,
      vencimento: vencimento,
    });

    const boletoAtualizado = await prisma.boleto.update({
      where: { id: boleto.id },
      data: resultado.ok
        ? {
            status: "REGISTRADO",
            nossoNumero: resultado.nossoNumero,
            linhaDigitavel: resultado.linhaDigitavel,
            codigoBarras: resultado.codigoBarras,
            dataRegistro: new Date(),
            mensagemErro: null,
          }
        : { status: "ERRO", mensagemErro: resultado.erro },
    });

    await prisma.logAtividade.create({
      data: {
        acao: `Boleto ${resultado.ok ? "registrado" : "com erro ao registrar"} - ${aluno.nome} (${competencia})`,
        entidade: "Boleto",
        entidadeId: boleto.id,
        usuario: session.user.name ?? "Usuário",
      },
    });

    return NextResponse.json(boletoAtualizado, { status: 201 });
  } catch (err) {
    return erroApi(err);
  }
}
