import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; emprestimoId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { emprestimoId } = await params;
  const emprestimo = await prisma.emprestimoChave.update({
    where: { id: emprestimoId },
    data: { devolucao: new Date() },
  });

  return NextResponse.json(emprestimo);
}
