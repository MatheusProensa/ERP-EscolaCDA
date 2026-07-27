import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const GESTAO = ["ADMIN", "DIRECAO"];

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const mes = params.get("mes");
  const ano = params.get("ano");

  const where =
    mes && ano
      ? {
          data: {
            gte: new Date(Date.UTC(Number(ano), Number(mes) - 1, 1)),
            lt: new Date(Date.UTC(Number(ano), Number(mes), 1)),
          },
        }
      : undefined;

  const eventos = await prisma.eventoCalendario.findMany({ where, orderBy: { data: "asc" } });
  return NextResponse.json(eventos);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!GESTAO.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json();
  const { titulo, data, categoria, descricao } = body;
  if (!titulo || !data || !categoria) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const evento = await prisma.eventoCalendario.create({
    data: { titulo, data: new Date(data), categoria, descricao: descricao || null },
  });
  return NextResponse.json(evento, { status: 201 });
}
