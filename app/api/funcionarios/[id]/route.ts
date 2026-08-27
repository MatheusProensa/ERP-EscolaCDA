import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { horaParaMin } from "@/lib/ponto";
import { erroApi } from "@/lib/apiError";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { ativo, nome, cpf, cargo, setor, telefone, email, dataNascimento, admissao, jornadaPrevista, participaPonto } = body;

  try {
    const funcionario = await prisma.funcionario.update({
      where: { id },
      data: {
        ativo: typeof ativo === "boolean" ? ativo : undefined,
        participaPonto: typeof participaPonto === "boolean" ? participaPonto : undefined,
        nome: nome || undefined,
        cpf: cpf || undefined,
        cargo: cargo || undefined,
        setor: setor || undefined,
        telefone: telefone !== undefined ? telefone || null : undefined,
        email: email !== undefined ? email || null : undefined,
        dataNascimento: dataNascimento !== undefined ? (dataNascimento ? new Date(dataNascimento) : null) : undefined,
        admissao: admissao ? new Date(admissao) : undefined,
        jornadaPrevistaMinutos:
          jornadaPrevista !== undefined ? (jornadaPrevista ? horaParaMin(jornadaPrevista) : null) : undefined,
      },
    });

    return NextResponse.json(funcionario);
  } catch (err) {
    return erroApi(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const funcionario = await prisma.funcionario.findUnique({ where: { id } });
  if (!funcionario) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });

  try {
    // RegistroPonto e DocumentoFuncionario têm onDelete: Cascade — excluir o
    // funcionário apaga junto o histórico de ponto e os documentos dele.
    await prisma.funcionario.delete({ where: { id } });

    await prisma.logAtividade.create({
      data: {
        acao: `Funcionário excluído - ${funcionario.nome}`,
        entidade: "Funcionario",
        entidadeId: id,
        usuario: session.user.name ?? "Usuário",
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return erroApi(err);
  }
}
