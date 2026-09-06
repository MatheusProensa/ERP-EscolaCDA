import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { avisarMudanca } from "@/lib/liveUpdate";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const chaves = await prisma.chave.findMany({
    where: { ativa: true },
    include: { emprestimos: { where: { devolucao: null } } },
    orderBy: { sala: "asc" },
  });
  return NextResponse.json(chaves);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { sala } = body;
  if (!sala) return NextResponse.json({ error: "Sala é obrigatória" }, { status: 400 });

  const chave = await prisma.chave.create({ data: { sala } });
  after(() => avisarMudanca("chaves"));
  return NextResponse.json(chave, { status: 201 });
}
