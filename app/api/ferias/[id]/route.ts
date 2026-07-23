import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { dataInicio, dataFim, tipo } = body;

  if (!dataInicio || !dataFim) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  const dias = Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const ferias = await prisma.ferias.update({
    where: { id },
    data: { ano: inicio.getFullYear(), dataInicio: inicio, dataFim: fim, dias, tipo: tipo || null },
  });

  return NextResponse.json(ferias);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  await prisma.ferias.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
