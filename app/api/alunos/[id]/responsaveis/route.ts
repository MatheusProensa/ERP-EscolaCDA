import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { formatarNomePessoa } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { nome, parentesco, telefone, email, cpf, autorizado } = body;

  if (!nome || !telefone) {
    return NextResponse.json({ error: "Nome e telefone são obrigatórios" }, { status: 400 });
  }

  try {
    const responsavel = await prisma.responsavel.create({
      data: {
        alunoId: id,
        nome: formatarNomePessoa(nome),
        parentesco: parentesco || "Responsável",
        telefone,
        email: email || null,
        cpf: cpf || null,
        autorizado: autorizado !== undefined ? !!autorizado : true,
      },
    });
    return NextResponse.json(responsavel, { status: 201 });
  } catch (err) {
    return erroApi(err);
  }
}
