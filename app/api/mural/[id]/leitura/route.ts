import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  await prisma.avisoLeitura.upsert({
    where: { avisoId_userId: { avisoId: id, userId: session.user.id } },
    create: { avisoId: id, userId: session.user.id },
    update: {},
  });

  const total = await prisma.avisoLeitura.count({ where: { avisoId: id } });

  return NextResponse.json({ ok: true, total });
}
