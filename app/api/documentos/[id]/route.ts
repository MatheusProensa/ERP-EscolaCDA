import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { titulo, categoria, subcategoria, arquivoUrl, descricao } = body;

  const documento = await prisma.documento.update({
    where: { id },
    data: {
      titulo: titulo || undefined,
      categoria: categoria || undefined,
      subcategoria: subcategoria !== undefined ? subcategoria || null : undefined,
      arquivoUrl: arquivoUrl || undefined,
      descricao: descricao !== undefined ? descricao || null : undefined,
    },
  });

  return NextResponse.json(documento);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  await prisma.documento.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
