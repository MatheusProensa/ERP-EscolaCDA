import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const documentos = await prisma.documentoInstitucional.findMany({
    orderBy: [{ categoria: "asc" }, { titulo: "asc" }],
  });
  return NextResponse.json(documentos);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json();
  const { titulo, categoria, link, validade, observacao } = body;

  if (!titulo || !categoria || !link) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const documento = await prisma.documentoInstitucional.create({
    data: {
      titulo,
      categoria,
      link,
      validade: validade ? new Date(validade) : null,
      observacao: observacao || null,
    },
  });

  return NextResponse.json(documento, { status: 201 });
}
