import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gerarContratoPdf } from "@/lib/gerarContratoPdf";
import { turnoDoContrato } from "@/lib/contratoTexto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  // Os campos abaixo, quando enviados, sobrescrevem o que veio do cadastro —
  // é a tela de revisão (GerarContratoModal) deixando corrigir um typo ou
  // valor sem precisar sair dali pra editar o cadastro do aluno primeiro.
  const {
    matriculaId,
    alunoNome,
    alunoDataNascimento,
    responsavelNome,
    responsavelCpf,
    valorMensalidade,
    turnoLabel,
    diaVencimento,
    mesInicioVencimento,
  } = body;
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
  const dadosContrato = {
    alunoNome: alunoNome || matricula.aluno.nome,
    alunoDataNascimento: alunoDataNascimento ? new Date(alunoDataNascimento) : matricula.aluno.dataNascimento,
    responsavelNome: responsavelNome || responsavel?.nome || "Não informado",
    responsavelCpf: responsavelCpf || responsavel?.cpf || null,
    turmaNome: matricula.turma.nome,
    turnoLabel: turnoLabel || turnoDoContrato(matricula.turma.nome, matricula.turma.turno),
    anoLetivo: matricula.anoLetivo.ano,
    valorMensalidade: Number(valorMensalidade) || matricula.valorMensalidade || 0,
    dataMatricula: matricula.dataMatricula,
    diaVencimento: diaVencimento || "",
    mesInicioVencimento: mesInicioVencimento || "",
  };
  const arquivo = await gerarContratoPdf(dadosContrato);

  // Guarda o retrato dos dados usados (não só o PDF pronto) — é o que permite
  // regenerar o mesmo contrato com o carimbo de assinatura depois, pelo link
  // público (app/assinar/[token]), sem re-derivar tudo do cadastro atual do
  // aluno (que pode já ter mudado) nem perder dia/mês de vencimento.
  const snapshot = {
    alunoNomeSnapshot: dadosContrato.alunoNome,
    alunoNascimentoSnapshot: dadosContrato.alunoDataNascimento,
    responsavelNomeSnapshot: dadosContrato.responsavelNome,
    responsavelCpfSnapshot: dadosContrato.responsavelCpf,
    turmaNomeSnapshot: dadosContrato.turmaNome,
    turnoLabelSnapshot: dadosContrato.turnoLabel,
    anoLetivoSnapshot: dadosContrato.anoLetivo,
    valorMensalidadeSnapshot: dadosContrato.valorMensalidade,
    dataMatriculaSnapshot: dadosContrato.dataMatricula,
    diaVencimentoSnapshot: dadosContrato.diaVencimento,
    mesInicioVencimentoSnapshot: dadosContrato.mesInicioVencimento,
  };

  const contrato = await prisma.contrato.upsert({
    where: { matriculaId },
    create: { matriculaId, arquivo, assinado: false, ...snapshot },
    update: { arquivo, ...snapshot },
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
