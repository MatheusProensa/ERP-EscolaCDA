import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";

async function podeEscrever(userId: string, role: string, turmaId: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  const vinculo = await prisma.vinculoPedagogico.findFirst({ where: { userId, turmaId, papel: "REGENTE" } });
  return !!vinculo;
}

/** Remove uma foto do portfólio — só a regente da turma daquele item. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.portfolioItem.findUnique({ where: { id }, select: { turmaId: true } });
  if (!item) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
  if (!(await podeEscrever(session.user.id, session.user.role, item.turmaId))) {
    return NextResponse.json({ error: "Só a professora regente dessa turma remove fotos do portfólio" }, { status: 403 });
  }

  try {
    await prisma.portfolioItem.delete({ where: { id } });
    after(() => avisarMudanca("pedagogico"));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
