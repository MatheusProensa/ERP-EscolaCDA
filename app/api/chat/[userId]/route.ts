import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { criarNotificacao } from "@/lib/notificacoes";
import { validarUploadDataUri } from "@/lib/validarUpload";
import { avisarChatDireto } from "@/lib/realtime";

const PAGINA = 50;

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { userId } = await params;
  const meId = session.user.id;
  const desde = req.nextUrl.searchParams.get("desde");
  const antes = req.nextUrl.searchParams.get("antes");

  const conversaWhere = {
    OR: [
      { remetenteId: meId, destinatarioId: userId },
      { remetenteId: userId, destinatarioId: meId },
    ],
  };

  // "desde": polling incremental — usa updatedAt (não createdAt) pra pegar tanto
  // mensagem nova quanto mudança em mensagem já vista (lida, editada, apagada).
  // "antes": paginação pra cima, carregando um lote mais antigo sob demanda.
  // Sem nenhum dos dois: abertura inicial da conversa, só o lote mais recente.
  const mensagens = await prisma.mensagem.findMany({
    where: {
      ...conversaWhere,
      ...(desde
        ? { updatedAt: { gt: new Date(desde) } }
        : antes
          ? { createdAt: { lt: new Date(antes) } }
          : {}),
    },
    orderBy: { createdAt: antes ? "desc" : "asc" },
    take: desde ? undefined : PAGINA,
  });
  if (antes) mensagens.reverse();

  // Marcar como lida só faz sentido se a pessoa realmente está olhando pra essa
  // conversa agora: abertura inicial, ou chegou mensagem nova nesse poll. Poupa
  // um UPDATE a cada 4s quando não há nada de fato novo pra marcar.
  const devemarcarLidas = !desde || (mensagens.length > 0 && !antes);
  if (devemarcarLidas) {
    const { count } = await prisma.mensagem.updateMany({
      where: { remetenteId: userId, destinatarioId: meId, lida: false },
      data: { lida: true },
    });
    // Avisa quem enviou que foi lido agora — o visto (✓✓) atualiza sem esperar
    // o próximo poll dele. Via after(): manda depois de já ter respondido, pra
    // abrir a conversa não ficar esperando essa chamada de rede pro Supabase
    // (era exatamente isso que fazia o clique "travar" um pouco).
    if (count > 0) after(() => avisarChatDireto({ remetenteId: meId, destinatarioId: userId }));
  }

  return NextResponse.json({ mensagens, temMais: antes ? mensagens.length === PAGINA : undefined });
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

  if (anexo) {
    const validacao = validarUploadDataUri(anexo);
    if (!validacao.ok) return NextResponse.json({ error: validacao.erro }, { status: 400 });
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

    // Notificação e aviso em tempo real não precisam segurar a resposta — o
    // client já mostra a mensagem otimisticamente, então isso roda depois de
    // já ter respondido (after()), sem atrasar o "enviado" na tela.
    after(() =>
      Promise.all([
        criarNotificacao({
          usuarioId: userId,
          tipo: "MENSAGEM",
          titulo: session.user.name ?? "Nova mensagem",
          corpo: conteudo ? String(conteudo).slice(0, 120) : `📎 ${anexoNome}`,
          link: `/chat/${meId}`,
        }),
        avisarChatDireto({ remetenteId: meId, destinatarioId: userId }),
      ])
    );

    return NextResponse.json(mensagem, { status: 201 });
  } catch (err) {
    return erroApi(err);
  }
}
