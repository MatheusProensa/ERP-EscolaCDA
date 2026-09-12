import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const eventos = await prisma.eventoFamilia.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { confirmacoes: true } } },
  });
  return NextResponse.json(eventos);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { nome, data, anoLetivoId } = body;

  if (!nome?.trim() || !anoLetivoId) {
    return NextResponse.json({ error: "Nome e ano letivo são obrigatórios" }, { status: 400 });
  }

  try {
    const evento = await prisma.eventoFamilia.create({
      data: { nome: nome.trim(), data: data ? new Date(data) : null, anoLetivoId },
    });
    return NextResponse.json(evento, { status: 201 });
  } catch (err) {
    return erroApi(err);
  }
}
