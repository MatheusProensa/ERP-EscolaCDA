import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { criarNotificacao } from "@/lib/notificacoes";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { userId } = await params;
  const meId = session.user.id;

  const mensagens = await prisma.mensagem.findMany({
    where: {
      OR: [
        { remetenteId: meId, destinatarioId: userId },
        { remetenteId: userId, destinatarioId: meId },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  await prisma.mensagem.updateMany({
    where: { remetenteId: userId, destinatarioId: meId, lida: false },
    data: { lida: true },
  });

  return NextResponse.json(mensagens);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { userId } = await params;
  const meId = session.user.id;
  if (userId === meId) {
    return NextResponse.json({ error: "Não é possível enviar mensagem para si mesmo" }, { status: 400 });
  }

  const body = await req.json();
  const { conteudo, anexo, anexoNome } = body;

  if (!conteudo && !anexo) {
    return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
  }

  try {
    const destinatario = await prisma.user.findUnique({ where: { id: userId } });
    if (!destinatario) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    const mensagem = await prisma.mensagem.create({
      data: {
        remetenteId: meId,
        destinatarioId: userId,
        conteudo: conteudo || null,
        anexo: anexo || null,
        anexoNome: anexoNome || null,
      },
    });

    await criarNotificacao({
      usuarioId: userId,
      tipo: "MENSAGEM",
      titulo: session.user.name ?? "Nova mensagem",
      corpo: conteudo ? String(conteudo).slice(0, 120) : `📎 ${anexoNome}`,
      link: `/chat/${meId}`,
    });

    return NextResponse.json(mensagem, { status: 201 });
  } catch (err) {
    return erroApi(err);
  }
}
