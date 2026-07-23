import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { matriculaId, itensFaltantes, trouxe, prazoReenvio } = body;

  if (!matriculaId) return NextResponse.json({ error: "matriculaId é obrigatório" }, { status: 400 });

  const registro = await prisma.controleMaterial.upsert({
    where: { matriculaId },
    update: {
      itensFaltantes: itensFaltantes ?? undefined,
      trouxe: typeof trouxe === "boolean" ? trouxe : undefined,
      prazoReenvio: prazoReenvio !== undefined ? (prazoReenvio ? new Date(prazoReenvio) : null) : undefined,
    },
    create: {
      matriculaId,
      itensFaltantes: itensFaltantes || null,
      trouxe: Boolean(trouxe),
      prazoReenvio: prazoReenvio ? new Date(prazoReenvio) : null,
    },
  });

  return NextResponse.json(registro, { status: 201 });
}
