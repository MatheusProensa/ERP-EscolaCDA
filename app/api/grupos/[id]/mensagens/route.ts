import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { criarNotificacao } from "@/lib/notificacoes";
import { validarUploadDataUri } from "@/lib/validarUpload";

const PAGINA = 50;

async function souParticipante(conversaId: string, usuarioId: string) {
  const p = await prisma.conversaParticipante.findUnique({
    where: { conversaId_usuarioId: { conversaId, usuarioId } },
  });
  return !!p;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const meId = session.user.id;
  if (!(await souParticipante(id, meId))) {
    return NextResponse.json({ error: "Você não participa dessa conversa" }, { status: 403 });
  }

  const desde = req.nextUrl.searchParams.get("desde");
  const antes = req.nextUrl.searchParams.get("antes");

  const mensagens = await prisma.mensagemGrupo.findMany({
    where: {
      conversaId: id,
      createdAt: desde ? { gt: new Date(desde) } : antes ? { lt: new Date(antes) } : undefined,
    },
    include: { remetente: { select: { id: true, name: true } } },
    orderBy: { createdAt: antes ? "desc" : "asc" },
    take: desde ? undefined : PAGINA,
  });
  if (antes) mensagens.reverse();

  if (!desde || (mensagens.length > 0 && !antes)) {
    await prisma.conversaParticipante.update({
      where: { conversaId_usuarioId: { conversaId: id, usuarioId: meId } },
      data: { ultimaLeituraEm: new Date() },
    });
  }

  return NextResponse.json({ mensagens, temMais: antes ? mensagens.length === PAGINA : undefined });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const meId = session.user.id;
  if (!(await souParticipante(id, meId))) {
    return NextResponse.json({ error: "Você não participa dessa conversa" }, { status: 403 });
  }

  const body = await req.json();
  const { conteudo, anexo, anexoNome } = body;

  if (!conteudo && !anexo) {
    return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
  }
  if (anexo) {
    const validacao = validarUploadDataUri(anexo);
    if (!validacao.ok) return NextResponse.json({ error: validacao.erro }, { status: 400 });
  }

  try {
    const mensagem = await prisma.mensagemGrupo.create({
      data: {
        conversaId: id,
        remetenteId: meId,
        conteudo: conteudo || null,
        anexo: anexo || null,
        anexoNome: anexoNome || null,
      },
      include: { remetente: { select: { id: true, name: true } } },
    });
    await prisma.conversaParticipante.update({
      where: { conversaId_usuarioId: { conversaId: id, usuarioId: meId } },
      data: { ultimaLeituraEm: new Date() },
    });

    const [conversa, outrosParticipantes] = await Promise.all([
      prisma.conversa.findUnique({ where: { id }, select: { nome: true } }),
      prisma.conversaParticipante.findMany({ where: { conversaId: id, usuarioId: { not: meId } }, select: { usuarioId: true } }),
    ]);
    await Promise.all(
      outrosParticipantes.map((p) =>
        criarNotificacao({
          usuarioId: p.usuarioId,
          tipo: "MENSAGEM_GRUPO",
          titulo: `${session.user.name ?? "Alguém"} em ${conversa?.nome ?? "grupo"}`,
          corpo: conteudo ? String(conteudo).slice(0, 120) : `📎 ${anexoNome}`,
          link: `/chat/g/${id}`,
        })
      )
    );

    return NextResponse.json(mensagem, { status: 201 });
  } catch (err) {
    return erroApi(err);
  }
}
