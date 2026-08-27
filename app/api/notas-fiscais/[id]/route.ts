import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { emitirNotaFiscal } from "@/lib/issnet";

// Tenta emitir de novo uma nota que ficou com status ERRO (ex.: depois que o
// certificado/autorização da prefeitura já estiverem configurados).
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const nota = await prisma.notaFiscal.findUnique({ where: { id }, include: { aluno: { include: { responsaveis: true } } } });
  if (!nota) return NextResponse.json({ error: "Nota fiscal não encontrada" }, { status: 404 });
  if (nota.status === "EMITIDA") {
    return NextResponse.json({ error: "Essa nota já foi emitida" }, { status: 400 });
  }

  try {
    const responsavel = nota.aluno.responsaveis[0];
    const resultado = await emitirNotaFiscal({
      tomadorNome: responsavel?.nome ?? nota.aluno.nome,
      tomadorCpf: responsavel?.cpf ?? null,
      tomadorEmail: responsavel?.email ?? null,
      competencia: nota.competencia,
      valorServico: nota.valorServico,
      discriminacao: nota.discriminacao,
    });

    const notaAtualizada = await prisma.notaFiscal.update({
      where: { id },
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

    return NextResponse.json(notaAtualizada);
  } catch (err) {
    return erroApi(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const nota = await prisma.notaFiscal.findUnique({ where: { id } });
  if (!nota) return NextResponse.json({ error: "Nota fiscal não encontrada" }, { status: 404 });
  if (nota.status === "EMITIDA") {
    return NextResponse.json({ error: "Não dá pra excluir uma nota já emitida — cancele na prefeitura se for o caso" }, { status: 400 });
  }

  try {
    await prisma.notaFiscal.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return erroApi(err);
  }
}
