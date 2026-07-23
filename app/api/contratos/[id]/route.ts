import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { assinado, marcarEnviado } = body;

  const contrato = await prisma.contrato.update({
    where: { id },
    data: {
      assinado: typeof assinado === "boolean" ? assinado : undefined,
      dataEnvio: marcarEnviado ? new Date() : undefined,
    },
  });

  return NextResponse.json(contrato);
}
