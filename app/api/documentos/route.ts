import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const documentos = await prisma.documento.findMany({ orderBy: [{ categoria: "asc" }, { titulo: "asc" }] });
  return NextResponse.json(documentos);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { titulo, categoria, subcategoria, arquivoUrl, descricao } = body;

  if (!titulo || !categoria || !arquivoUrl) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const documento = await prisma.documento.create({
    data: {
      titulo,
      categoria,
      subcategoria: subcategoria || null,
      arquivoUrl,
      descricao: descricao || null,
    },
  });

  return NextResponse.json(documento, { status: 201 });
}
