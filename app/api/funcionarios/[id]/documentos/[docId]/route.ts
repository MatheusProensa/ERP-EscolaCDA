import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { avisarMudanca } from "@/lib/liveUpdate";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { docId } = await params;
  await prisma.documentoFuncionario.delete({ where: { id: docId } });

  after(() => avisarMudanca("funcionarios"));
  return NextResponse.json({ ok: true });
}
