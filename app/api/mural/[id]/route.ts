import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { titulo, conteudo, fixado } = body;

  const aviso = await prisma.muralAviso.update({
    where: { id },
    data: {
      titulo: titulo || undefined,
      conteudo: conteudo || undefined,
      fixado: typeof fixado === "boolean" ? fixado : undefined,
    },
  });

  return NextResponse.json(aviso);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  await prisma.muralAviso.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
