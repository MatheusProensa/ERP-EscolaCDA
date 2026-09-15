import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";
import { criarNotificacao } from "@/lib/notificacoes";
import { isoData } from "@/lib/planejamento";

/** Aprovar ou devolver uma Atividade Gráfica/Tema Literário enviada — mesmo
 * fluxo do Planejamento (/api/planejamentos/[id]/revisar). Só quem coordena
 * a Área Pedagógica (ou ADMIN). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.user.role !== "ADMIN" && !session.user.coordenaAreaPedagogica) {
    return NextResponse.json({ error: "Só quem coordena a Área Pedagógica revisa entregas" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body?.status === "APROVADO" ? "APROVADO" : body?.status === "DEVOLVIDO" ? "DEVOLVIDO" : null;
  const comentario = body?.comentario ? String(body.comentario).trim() : null;
  if (!status) return NextResponse.json({ error: "Informe status (APROVADO ou DEVOLVIDO)" }, { status: 400 });
  if (status === "DEVOLVIDO" && !comentario) {
    return NextResponse.json({ error: "Devolver exige um comentário explicando o que corrigir" }, { status: 400 });
  }

  const folha = await prisma.folhaMensal.findUnique({
    where: { id },
    select: { id: true, tipo: true, turmaId: true, semanaInicio: true, autorId: true, turma: { select: { nome: true } } },
  });
  if (!folha) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });

  const nomeDoc = folha.tipo === "TEMA_LITERARIO" ? "Tema Literário" : "Atividade Gráfica";

  try {
    await prisma.folhaMensal.update({
      where: { id },
      data: { status, comentarioCoordenadora: comentario, comentarioAutorId: session.user.id, comentarioEm: new Date(), liComentarioEm: null },
    });

    await prisma.logAtividade.create({
      data: {
        acao: `${nomeDoc} da semana de ${isoData(folha.semanaInicio)} ${status === "APROVADO" ? "aprovado" : "devolvido"} (${folha.turma.nome})`,
        entidade: "FolhaMensal",
        entidadeId: folha.id,
        usuario: session.user.name ?? "Usuário",
      },
    });

    await criarNotificacao({
      usuarioId: folha.autorId,
      tipo: status === "APROVADO" ? "FOLHA_MENSAL_APROVADA" : "FOLHA_MENSAL_DEVOLVIDA",
      titulo: status === "APROVADO" ? `${folha.turma.nome}: ${nomeDoc} aprovado` : `${folha.turma.nome}: ${nomeDoc} devolvido pra revisão`,
      corpo: comentario ?? undefined,
      link: `/pedagogico/planejamento/${folha.turmaId}/${folha.tipo === "TEMA_LITERARIO" ? "tema-literario" : "atividade-grafica"}`,
    });

    after(() => avisarMudanca("pedagogico"));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
