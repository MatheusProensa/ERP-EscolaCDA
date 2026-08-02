import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { conteudo } = body;

  if (!conteudo || !String(conteudo).trim()) {
    return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
  }

  const mensagem = await prisma.mensagemGrupo.findUnique({ where: { id } });
  if (!mensagem) return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 });
  if (mensagem.remetenteId !== session.user.id) {
    return NextResponse.json({ error: "Só quem enviou pode editar a mensagem" }, { status: 403 });
  }
  if (mensagem.excluida) {
    return NextResponse.json({ error: "Não é possível editar uma mensagem apagada" }, { status: 400 });
  }

  try {
    const atualizada = await prisma.mensagemGrupo.update({
      where: { id },
      data: { conteudo: String(conteudo).trim(), editadaEm: new Date() },
      include: { remetente: { select: { id: true, name: true } } },
    });
    return NextResponse.json(atualizada);
  } catch (err) {
    return erroApi(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  const mensagem = await prisma.mensagemGrupo.findUnique({ where: { id } });
  if (!mensagem) return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 });
  if (mensagem.remetenteId !== session.user.id) {
    return NextResponse.json({ error: "Só quem enviou pode apagar a mensagem" }, { status: 403 });
  }

  try {
    const atualizada = await prisma.mensagemGrupo.update({
      where: { id },
      data: { excluida: true, conteudo: null, anexo: null, anexoNome: null },
      include: { remetente: { select: { id: true, name: true } } },
    });
    return NextResponse.json(atualizada);
  } catch (err) {
    return erroApi(err);
  }
}
