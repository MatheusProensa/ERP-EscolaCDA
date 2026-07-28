import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { horaParaMin } from "@/lib/ponto";
import { erroApi } from "@/lib/apiError";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const funcionarios = await prisma.funcionario.findMany({ orderBy: { nome: "asc" } });
  return NextResponse.json(funcionarios);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { nome, cpf, cargo, setor, telefone, email, admissao, dataNascimento, jornadaPrevista, participaPonto } = body;

  if (!nome || !cpf || !cargo || !setor || !admissao) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  try {
    const funcionario = await prisma.funcionario.create({
      data: {
        nome,
        cpf,
        cargo,
        setor,
        telefone: telefone || null,
        email: email || null,
        admissao: new Date(admissao),
        dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
        jornadaPrevistaMinutos: jornadaPrevista ? horaParaMin(jornadaPrevista) : null,
        participaPonto: !!participaPonto,
      },
    });

    return NextResponse.json(funcionario, { status: 201 });
  } catch (err) {
    return erroApi(err);
  }
}
