import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gerarContratoPdf } from "@/lib/gerarContratoPdf";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { matriculaId } = body;
  if (!matriculaId) {
    return NextResponse.json({ error: "matriculaId é obrigatório" }, { status: 400 });
  }

  const matricula = await prisma.matricula.findUnique({
    where: { id: matriculaId },
    include: {
      aluno: { include: { responsaveis: true } },
      turma: true,
      anoLetivo: true,
    },
  });

  if (!matricula) return NextResponse.json({ error: "Matrícula não encontrada" }, { status: 404 });

  const responsavel = matricula.aluno.responsaveis[0];
  const arquivo = await gerarContratoPdf({
    alunoNome: matricula.aluno.nome,
    alunoDataNascimento: matricula.aluno.dataNascimento,
    responsavelNome: responsavel?.nome ?? "Não informado",
    responsavelCpf: responsavel?.cpf ?? null,
    turmaNome: matricula.turma.nome,
    anoLetivo: matricula.anoLetivo.ano,
    valorMensalidade: matricula.valorMensalidade ?? 0,
    dataMatricula: matricula.dataMatricula,
  });

  const contrato = await prisma.contrato.upsert({
    where: { matriculaId },
    create: { matriculaId, arquivo, assinado: false },
    update: { arquivo },
  });

  await prisma.logAtividade.create({
    data: {
      acao: `Contrato gerado - ${matricula.aluno.nome}`,
      entidade: "Contrato",
      entidadeId: contrato.id,
      usuario: session.user.name ?? "Usuário",
    },
  });

  return NextResponse.json(contrato, { status: 201 });
}
