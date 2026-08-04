import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { garantirCanaisDoUsuario, listarGrupos } from "@/lib/grupos";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // "garantir" só vem do client na primeira chamada da sessão de chat — o poll
  // de 15s repetia esse upsert à toa em toda checagem, e também desfazia
  // silenciosamente qualquer "sair do canal" que viesse a existir no futuro.
  if (req.nextUrl.searchParams.get("garantir")) {
    await garantirCanaisDoUsuario(session.user.id, session.user.role);
  }
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

  try {
    const idsParticipantes = Array.from(new Set([session.user.id, ...membros]));
    const usuariosValidos = await prisma.user.count({ where: { id: { in: idsParticipantes } } });
    if (usuariosValidos !== idsParticipantes.length) {
      return NextResponse.json({ error: "Um ou mais participantes não existem" }, { status: 400 });
    }

    const grupo = await prisma.conversa.create({
      data: {
        nome: nome.trim(),
        tipo: "GRUPO",
        criadaPorId: session.user.id,
        participantes: { create: idsParticipantes.map((usuarioId) => ({ usuarioId })) },
      },
    });

    return NextResponse.json({ id: grupo.id, nome: grupo.nome, tipo: grupo.tipo }, { status: 201 });
  } catch (err) {
    return erroApi(err);
  }
}
