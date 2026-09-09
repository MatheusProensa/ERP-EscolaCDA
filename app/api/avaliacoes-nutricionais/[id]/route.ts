import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.avaliacaoNutricional.delete({ where: { id } });
    after(() => avisarMudanca("avaliacao-nutricional"));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
