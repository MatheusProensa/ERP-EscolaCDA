import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { tipo, nomeArquivo, arquivo } = body;

  if (!tipo || !nomeArquivo || !arquivo) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const documento = await prisma.documentoFuncionario.create({
    data: { funcionarioId: id, tipo, nomeArquivo, arquivo },
  });

  return NextResponse.json(documento, { status: 201 });
}
