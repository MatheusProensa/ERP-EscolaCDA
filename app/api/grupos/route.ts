import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { garantirCanaisDoUsuario, listarGrupos } from "@/lib/grupos";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  await garantirCanaisDoUsuario(session.user.id, session.user.role);
  const grupos = await listarGrupos(session.user.id);
  return NextResponse.json(grupos);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { nome, membros } = body;
  if (!nome?.trim()) return NextResponse.json({ error: "Nome do grupo é obrigatório" }, { status: 400 });
  if (!Array.isArray(membros) || membros.length === 0) {
    return NextResponse.json({ error: "Selecione ao menos um participante" }, { status: 400 });
  }

  const idsParticipantes = Array.from(new Set([session.user.id, ...membros]));
  const grupo = await prisma.conversa.create({
    data: {
      nome: nome.trim(),
      tipo: "GRUPO",
      criadaPorId: session.user.id,
      participantes: { create: idsParticipantes.map((usuarioId) => ({ usuarioId })) },
    },
  });

  return NextResponse.json({ id: grupo.id, nome: grupo.nome, tipo: grupo.tipo }, { status: 201 });
}
