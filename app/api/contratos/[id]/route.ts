import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  const contrato = await prisma.contrato.findUnique({
    where: { id },
    include: { matricula: { include: { aluno: true } } },
  });
  if (!contrato) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });

  try {
    await prisma.contrato.delete({ where: { id } });

    await prisma.logAtividade.create({
      data: {
        acao: `Contrato excluído - ${contrato.matricula.aluno.nome}`,
        entidade: "Contrato",
        entidadeId: id,
        usuario: session.user.name ?? "Usuário",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
