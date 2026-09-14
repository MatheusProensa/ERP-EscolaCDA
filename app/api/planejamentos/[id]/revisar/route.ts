import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";
import { criarNotificacao } from "@/lib/notificacoes";
import { isoData } from "@/lib/planejamento";

/** Aprovar ou devolver um planejamento enviado (pedido do dono, set/2026:
 * fluxo de aprovação da coordenadora — "curtida 👍 pra aprovação rápida" ou
 * "comentário quando tem algo a corrigir"). Só quem coordena a Área
 * Pedagógica (ou ADMIN) — não é por turma, a coordenadora enxerga todas. */
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

  const planejamento = await prisma.planejamento.findUnique({
    where: { id },
    select: { id: true, turmaId: true, semanaInicio: true, autorId: true, turma: { select: { nome: true } } },
  });
  if (!planejamento) return NextResponse.json({ error: "Planejamento não encontrado" }, { status: 404 });

  try {
    await prisma.planejamento.update({
      where: { id },
      data: {
        status,
        comentarioCoordenadora: comentario,
        comentarioAutorId: session.user.id,
        comentarioEm: new Date(),
        liComentarioEm: null,
      },
    });

    // O veredito entra NA VERSÃO que foi enviada (é o resultado daquele
    // envio específico, não um envio novo) — pedido do dono: "nunca
    // substitui sem rastro". Se por algum motivo não achar versão (dado
    // antigo, de antes do versionamento existir), segue sem quebrar.
    const ultimaVersao = await prisma.planejamentoVersao.findFirst({
      where: { planejamentoId: id },
      orderBy: { numero: "desc" },
    });
    if (ultimaVersao) {
      await prisma.planejamentoVersao.update({
        where: { id: ultimaVersao.id },
        data: { veredito: status, comentario, decididoPorId: session.user.id, decididoEm: new Date() },
      });
    }

    await prisma.logAtividade.create({
      data: {
        acao: `Planejamento da semana de ${isoData(planejamento.semanaInicio)} ${status === "APROVADO" ? "aprovado" : "devolvido"} (${planejamento.turma.nome})`,
        entidade: "Planejamento",
        entidadeId: planejamento.id,
        usuario: session.user.name ?? "Usuário",
      },
    });

    await criarNotificacao({
      usuarioId: planejamento.autorId,
      tipo: status === "APROVADO" ? "PLANEJAMENTO_APROVADO" : "PLANEJAMENTO_DEVOLVIDO",
      titulo:
        status === "APROVADO"
          ? `${planejamento.turma.nome}: planejamento aprovado`
          : `${planejamento.turma.nome}: planejamento devolvido pra revisão`,
      corpo: comentario ?? undefined,
      link: `/pedagogico/planejamento/${planejamento.turmaId}`,
    });

    after(() => avisarMudanca("pedagogico"));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
