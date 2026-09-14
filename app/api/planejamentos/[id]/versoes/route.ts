import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Histórico de versões do Planejamento (pedido do dono, set/2026: "nunca
 * substitui sem rastro... importante pra auditoria ou questionamento
 * futuro") — 1 linha por envio/reenvio, com o conteúdo congelado daquele
 * momento e o veredito que recebeu. Qualquer um do Pedagógico consulta. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const versoes = await prisma.planejamentoVersao.findMany({
    where: { planejamentoId: id },
    orderBy: { numero: "desc" },
    include: {
      enviadoPor: { select: { name: true } },
      decididoPor: { select: { name: true } },
    },
  });

  return NextResponse.json(
    versoes.map((v) => ({
      numero: v.numero,
      conteudo: v.conteudo,
      enviadoPorNome: v.enviadoPor.name,
      enviadoEm: v.enviadoEm.toISOString(),
      veredito: v.veredito,
      comentario: v.comentario,
      decididoPorNome: v.decididoPor?.name ?? null,
      decididoEm: v.decididoEm?.toISOString() ?? null,
    }))
  );
}
