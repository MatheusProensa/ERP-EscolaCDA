import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GESTAO } from "@/lib/permissoes";

async function souParticipante(conversaId: string, usuarioId: string) {
  const p = await prisma.conversaParticipante.findUnique({
    where: { conversaId_usuarioId: { conversaId, usuarioId } },
  });
  return !!p;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  if (!(await souParticipante(id, session.user.id))) {
    return NextResponse.json({ error: "Você não participa dessa conversa" }, { status: 403 });
  }

  const conversa = await prisma.conversa.findUnique({
    where: { id },
    include: { participantes: { include: { usuario: { select: { id: true, name: true, role: true } } } } },
  });
  if (!conversa) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  return NextResponse.json({
    id: conversa.id,
    nome: conversa.nome,
    tipo: conversa.tipo,
    criadaPorId: conversa.criadaPorId,
    participantes: conversa.participantes.map((p) => p.usuario),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const conversa = await prisma.conversa.findUnique({ where: { id } });
  if (!conversa) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  if (conversa.tipo !== "GRUPO") {
    return NextResponse.json({ error: "Canais de setor não podem ser editados" }, { status: 400 });
  }
  const souGestaoOuDono =
    GESTAO.includes(session.user.role as (typeof GESTAO)[number]) || conversa.criadaPorId === session.user.id;
  if (!souGestaoOuDono) {
    return NextResponse.json({ error: "Só quem criou o grupo (ou a direção) pode editá-lo" }, { status: 403 });
  }

  const body = await req.json();
  const { nome, adicionar, remover } = body;

  if (nome?.trim()) {
    await prisma.conversa.update({ where: { id }, data: { nome: nome.trim() } });
  }
  if (Array.isArray(adicionar) && adicionar.length > 0) {
    await prisma.conversaParticipante.createMany({
      data: adicionar.map((usuarioId: string) => ({ conversaId: id, usuarioId })),
      skipDuplicates: true,
    });
  }
  if (Array.isArray(remover) && remover.length > 0) {
    await prisma.conversaParticipante.deleteMany({ where: { conversaId: id, usuarioId: { in: remover } } });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const conversa = await prisma.conversa.findUnique({ where: { id } });
  if (!conversa) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  if (conversa.tipo !== "GRUPO") {
    // Canal de setor: "excluir" só remove o próprio usuário da lista de participantes.
    await prisma.conversaParticipante.deleteMany({ where: { conversaId: id, usuarioId: session.user.id } });
    return NextResponse.json({ ok: true });
  }

  const souGestaoOuDono =
    GESTAO.includes(session.user.role as (typeof GESTAO)[number]) || conversa.criadaPorId === session.user.id;
  if (!souGestaoOuDono) {
    return NextResponse.json({ error: "Só quem criou o grupo (ou a direção) pode excluí-lo" }, { status: 403 });
  }

  await prisma.conversa.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
