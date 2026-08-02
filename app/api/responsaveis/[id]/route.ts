import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { nome, parentesco, telefone, email, cpf, autorizado } = body;

  try {
    const responsavel = await prisma.responsavel.update({
      where: { id },
      data: {
        nome: nome || undefined,
        parentesco: parentesco || undefined,
        telefone: telefone || undefined,
        email: email !== undefined ? email || null : undefined,
        cpf: cpf !== undefined ? cpf || null : undefined,
        autorizado: autorizado !== undefined ? !!autorizado : undefined,
      },
    });
    return NextResponse.json(responsavel);
  } catch (err) {
    return erroApi(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.responsavel.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
