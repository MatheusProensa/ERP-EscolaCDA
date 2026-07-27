import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { titulo, categoria, link, validade, observacao } = body;

  const documento = await prisma.documentoInstitucional.update({
    where: { id },
    data: {
      titulo: titulo || undefined,
      categoria: categoria || undefined,
      link: link || undefined,
      validade: validade !== undefined ? (validade ? new Date(validade) : null) : undefined,
      observacao: observacao !== undefined ? observacao || null : undefined,
    },
  });

  return NextResponse.json(documento);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  await prisma.documentoInstitucional.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
