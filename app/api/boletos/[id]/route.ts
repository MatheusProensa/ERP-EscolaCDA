import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { registrarBoleto } from "@/lib/banrisul";

// Tenta registrar de novo um boleto que ficou com status ERRO (ex.: depois que
// o Convênio de Cobrança/credenciais da API já estiverem configurados).
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const boleto = await prisma.boleto.findUnique({ where: { id }, include: { aluno: { include: { responsaveis: true } } } });
  if (!boleto) return NextResponse.json({ error: "Boleto não encontrado" }, { status: 404 });
  if (boleto.status === "REGISTRADO" || boleto.status === "PAGO") {
    return NextResponse.json({ error: "Esse boleto já foi registrado" }, { status: 400 });
  }

  try {
    const responsavel = boleto.aluno.responsaveis[0];
    const resultado = await registrarBoleto({
      pagadorNome: responsavel?.nome ?? boleto.aluno.nome,
      pagadorCpf: responsavel?.cpf ?? null,
      competencia: boleto.competencia,
      valor: boleto.valor,
      vencimento: boleto.vencimento.toISOString().slice(0, 10),
    });

    const boletoAtualizado = await prisma.boleto.update({
      where: { id },
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

    return NextResponse.json(boletoAtualizado);
  } catch (err) {
    return erroApi(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const boleto = await prisma.boleto.findUnique({ where: { id } });
  if (!boleto) return NextResponse.json({ error: "Boleto não encontrado" }, { status: 404 });
  if (boleto.status === "REGISTRADO" || boleto.status === "PAGO") {
    return NextResponse.json({ error: "Não dá pra excluir um boleto já registrado — cancele no banco se for o caso" }, { status: 400 });
  }

  try {
    await prisma.boleto.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return erroApi(err);
  }
}
