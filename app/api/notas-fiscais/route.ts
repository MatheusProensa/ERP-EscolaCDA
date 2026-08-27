import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { emitirNotaFiscal } from "@/lib/issnet";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const alunoId = searchParams.get("alunoId") || undefined;
  const competencia = searchParams.get("competencia") || undefined;
  const status = searchParams.get("status") || undefined;

  const notas = await prisma.notaFiscal.findMany({
    where: {
      alunoId,
      competencia: competencia || undefined,
      status: (status as never) || undefined,
    },
    include: { aluno: { select: { id: true, nome: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(notas);
}

// Cria o registro da nota e já tenta emitir na hora — enquanto o webservice não
// estiver configurado (ver lib/issnet.ts), fica salva como PENDENTE com o motivo
// do erro, sem travar o cadastro: dá pra tentar de novo depois em /[id].
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { alunoId, competencia, valorServico, discriminacao } = body;

  if (!alunoId || !competencia || !valorServico) {
    return NextResponse.json({ error: "Aluno, competência e valor do serviço são obrigatórios" }, { status: 400 });
  }

  const aluno = await prisma.aluno.findUnique({
    where: { id: alunoId },
    include: { responsaveis: true },
  });
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  const responsavel = aluno.responsaveis[0];

  try {
    const nota = await prisma.notaFiscal.create({
      data: {
        alunoId,
        competencia,
        valorServico: Number(valorServico),
        discriminacao: discriminacao || `Prestação de serviços educacionais — referente a ${competencia}`,
        usuario: session.user.name ?? "Usuário",
      },
    });

    const resultado = await emitirNotaFiscal({
      tomadorNome: responsavel?.nome ?? aluno.nome,
      tomadorCpf: responsavel?.cpf ?? null,
      tomadorEmail: responsavel?.email ?? null,
      competencia: nota.competencia,
      valorServico: nota.valorServico,
      discriminacao: nota.discriminacao,
    });

    const notaAtualizada = await prisma.notaFiscal.update({
      where: { id: nota.id },
      data: resultado.ok
        ? {
            status: "EMITIDA",
            numeroNota: resultado.numeroNota,
            serieNota: resultado.serieNota,
            codigoVerificacao: resultado.codigoVerificacao,
            protocolo: resultado.protocolo,
            dataEmissao: new Date(),
            mensagemErro: null,
          }
        : { status: "ERRO", mensagemErro: resultado.erro },
    });

    await prisma.logAtividade.create({
      data: {
        acao: `Nota fiscal ${resultado.ok ? "emitida" : "com erro ao emitir"} - ${aluno.nome} (${competencia})`,
        entidade: "NotaFiscal",
        entidadeId: nota.id,
        usuario: session.user.name ?? "Usuário",
      },
    });

    return NextResponse.json(notaAtualizada, { status: 201 });
  } catch (err) {
    return erroApi(err);
  }
}
