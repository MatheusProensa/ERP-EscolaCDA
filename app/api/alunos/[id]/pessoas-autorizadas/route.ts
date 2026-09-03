import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { nome, parentesco } = body;

  if (!nome?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  try {
    const pessoa = await prisma.pessoaAutorizada.create({
      data: {
        alunoId: id,
        nome: nome.trim(),
        parentesco: parentesco?.trim() || "Não informado",
      },
    });
    return NextResponse.json(pessoa, { status: 201 });
  } catch (err) {
    return erroApi(err);
  }
}
