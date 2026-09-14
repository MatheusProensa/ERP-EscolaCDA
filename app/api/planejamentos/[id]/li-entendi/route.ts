import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";

/** Confirmação de leitura ("li e entendi") do comentário da coordenadora —
 * pedido do dono, set/2026: "fecha o loop sem depender de WhatsApp". Só a
 * regente da turma (ou ADMIN) confirma. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const planejamento = await prisma.planejamento.findUnique({ where: { id }, select: { turmaId: true } });
  if (!planejamento) return NextResponse.json({ error: "Planejamento não encontrado" }, { status: 404 });

  if (session.user.role !== "ADMIN") {
    const vinculo = await prisma.vinculoPedagogico.findFirst({
      where: { userId: session.user.id, turmaId: planejamento.turmaId, papel: "REGENTE" },
    });
    if (!vinculo) return NextResponse.json({ error: "Só a professora regente dessa turma confirma a leitura" }, { status: 403 });
  }

  try {
    await prisma.planejamento.update({ where: { id }, data: { liComentarioEm: new Date() } });
    after(() => avisarMudanca("pedagogico"));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
