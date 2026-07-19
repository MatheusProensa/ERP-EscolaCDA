import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { ativo, nome, cargo, setor, telefone, email } = body;

  const funcionario = await prisma.funcionario.update({
    where: { id },
    data: {
      ativo: typeof ativo === "boolean" ? ativo : undefined,
      nome: nome || undefined,
      cargo: cargo || undefined,
      setor: setor || undefined,
      telefone: telefone !== undefined ? telefone || null : undefined,
      email: email !== undefined ? email || null : undefined,
    },
  });

  return NextResponse.json(funcionario);
}
