import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { funcionarioId, dataInicio, dataFim, tipo } = body;

  if (!funcionarioId || !dataInicio || !dataFim) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  const dias = Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const ferias = await prisma.ferias.create({
    data: {
      funcionarioId,
      ano: inicio.getFullYear(),
      dataInicio: inicio,
      dataFim: fim,
      dias,
      tipo: tipo || null,
    },
  });

  return NextResponse.json(ferias, { status: 201 });
}
