import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

const STATUS = [
  "AGUARDANDO",
  "CONTATADO",
  "CHAMAR_NOVAMENTE",
  "NAO_RESPONDEU",
  "PORTAS_ABERTAS",
  "MATRICULADO",
  "DESISTIU",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status, observacoes } = body;

  if (status !== undefined && !STATUS.includes(status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }

  try {
    const item = await prisma.listaEspera.update({
      where: { id },
      data: {
        status: status || undefined,
        observacoes: observacoes !== undefined ? observacoes || null : undefined,
      },
    });
    return NextResponse.json(item);
  } catch (err) {
    return erroApi(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.listaEspera.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
