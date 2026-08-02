import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const lista = await prisma.listaEspera.findMany({
    include: { turmaDesejada: { select: { nome: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(lista);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { nomeCrianca, dataNascimento, nomeResponsavel, telefoneResponsavel, emailResponsavel, turmaDesejadaId, observacoes } = body;

  if (!nomeCrianca || !nomeResponsavel || !telefoneResponsavel) {
    return NextResponse.json({ error: "Nome da criança, nome e telefone do responsável são obrigatórios" }, { status: 400 });
  }

  try {
    const item = await prisma.listaEspera.create({
      data: {
        nomeCrianca,
        dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
        nomeResponsavel,
        telefoneResponsavel,
        emailResponsavel: emailResponsavel || null,
        turmaDesejadaId: turmaDesejadaId || null,
        observacoes: observacoes || null,
      },
    });

    await prisma.logAtividade.create({
      data: {
        acao: `Adicionado(a) à lista de espera - ${nomeCrianca}`,
        entidade: "ListaEspera",
        entidadeId: item.id,
        usuario: session.user.name ?? "Usuário",
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    return erroApi(err);
  }
}
