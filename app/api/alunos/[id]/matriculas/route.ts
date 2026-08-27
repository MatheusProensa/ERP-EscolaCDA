import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { turmaId, valorMensalidade } = body;

  if (!turmaId) return NextResponse.json({ error: "Turma é obrigatória" }, { status: 400 });

  const [aluno, turma] = await Promise.all([
    prisma.aluno.findUnique({ where: { id } }),
    prisma.turma.findUnique({ where: { id: turmaId } }),
  ]);
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
  if (!turma) return NextResponse.json({ error: "Turma não encontrada" }, { status: 400 });

  const jaMatriculado = await prisma.matricula.findFirst({
    where: { alunoId: id, turmaId, situacao: "ATIVA" },
  });
  if (jaMatriculado) {
    return NextResponse.json({ error: "Esse aluno já está matriculado nessa turma" }, { status: 400 });
  }

  // Controle de vagas por turma desativado por enquanto — os números de
  // capacidade cadastrados não são confiáveis ainda. Volta quando tiver o
  // valor real por turma.
  const valor = Number(valorMensalidade) || 450;

  try {
    const matricula = await prisma.$transaction(async (tx) => {
      const nova = await tx.matricula.create({
        data: { alunoId: id, turmaId, anoLetivoId: turma.anoLetivoId, situacao: "ATIVA", valorMensalidade: valor },
      });

      await tx.logAtividade.create({
        data: {
          acao: `Nova matrícula em ${turma.nome} - ${aluno.nome}`,
          entidade: "Matricula",
          entidadeId: nova.id,
          usuario: session.user.name ?? "Usuário",
        },
      });

      return nova;
    });

    return NextResponse.json(matricula, { status: 201 });
  } catch (err) {
    return erroApi(err);
  }
}
