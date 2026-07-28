import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { matriculaId, descricao, valor, vencimento } = body;

  const valorNumerico = Number(valor);
  if (!matriculaId || !descricao || !vencimento || Number.isNaN(valorNumerico) || valorNumerico <= 0) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes ou valor inválido" }, { status: 400 });
  }

  try {
    const dataVencimento = new Date(vencimento);
    const mensalidade = await prisma.mensalidade.create({
      data: {
        matriculaId,
        mes: dataVencimento.getMonth() + 1,
        ano: dataVencimento.getFullYear(),
        valor: valorNumerico,
        vencimento: dataVencimento,
        descricao,
        situacao: "PENDENTE",
      },
    });

    return NextResponse.json(mensalidade, { status: 201 });
  } catch (err) {
    return erroApi(err);
  }
}
