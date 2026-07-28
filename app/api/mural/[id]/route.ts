import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GESTAO } from "@/lib/permissoes";

async function podeGerenciar(avisoId: string, userId: string, role: string) {
  if (GESTAO.includes(role as (typeof GESTAO)[number])) return true;
  const aviso = await prisma.muralAviso.findUnique({ where: { id: avisoId }, select: { autorId: true } });
  return !!aviso && aviso.autorId === userId;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { titulo, conteudo, fixado } = body;

  // Fixar/desafixar é uma ação de organização, liberada a quem já tem acesso ao Mural.
  // Editar título/conteúdo é restrito a quem publicou (ou à direção).
  if ((titulo || conteudo) && !(await podeGerenciar(id, session.user.id, session.user.role))) {
    return NextResponse.json({ error: "Só quem publicou o aviso (ou a direção) pode editá-lo" }, { status: 403 });
  }

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
  if (!(await podeGerenciar(id, session.user.id, session.user.role))) {
    return NextResponse.json({ error: "Só quem publicou o aviso (ou a direção) pode excluí-lo" }, { status: 403 });
  }

  await prisma.muralAviso.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
