import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

/** Converte um erro não tratado de uma rota de API numa resposta JSON consistente. */
export function erroApi(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Já existe um registro com esse valor (dado duplicado)." }, { status: 409 });
    }
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Registro não encontrado." }, { status: 404 });
    }
  }
  console.error(err);
  return NextResponse.json({ error: "Erro interno ao processar a solicitação." }, { status: 500 });
}
