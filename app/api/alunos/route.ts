import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const alunos = await prisma.aluno.findMany({
    include: { matriculas: { include: { turma: true } } },
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(alunos);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const {
    nome,
    dataNascimento,
    naturalidade,
    cpf,
    rg,
    certidaoNascimento,
    foto,
    endereco,
    bairro,
    cidade,
    cep,
    tipoSanguineo,
    convenioMedico,
    medicacaoContinua,
    alergias,
    restricoes,
    necessidadesEsp,
    autorizacaoImagem,
    turmaId,
    valorMensalidade,
    responsavel,
  } = body;

  if (!nome || !dataNascimento || !turmaId || !responsavel?.nome || !responsavel?.telefone) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
  if (!turma) return NextResponse.json({ error: "Turma não encontrada" }, { status: 400 });

  const valor = Number(valorMensalidade) || 450;

  const aluno = await prisma.$transaction(async (tx) => {
    const novoAluno = await tx.aluno.create({
      data: {
        nome,
        dataNascimento: new Date(dataNascimento),
        naturalidade: naturalidade || null,
        cpf: cpf || null,
        rg: rg || null,
        certidaoNascimento: certidaoNascimento || null,
        foto: foto || null,
        endereco: endereco || null,
        bairro: bairro || null,
        cidade: cidade || null,
        cep: cep || null,
        tipoSanguineo: tipoSanguineo || null,
        convenioMedico: convenioMedico || null,
        medicacaoContinua: medicacaoContinua || null,
        alergias: alergias || null,
        restricoes: restricoes || null,
        necessidadesEsp: necessidadesEsp || null,
        autorizacaoImagem: !!autorizacaoImagem,
        responsaveis: {
          create: {
            nome: responsavel.nome,
            parentesco: responsavel.parentesco || "Responsável",
            telefone: responsavel.telefone,
            email: responsavel.email || null,
            cpf: responsavel.cpf || null,
          },
        },
      },
    });

    const matricula = await tx.matricula.create({
      data: {
        alunoId: novoAluno.id,
        turmaId,
        anoLetivoId: turma.anoLetivoId,
        situacao: "ATIVA",
      },
    });

    await tx.mensalidade.createMany({
      data: Array.from({ length: 12 }, (_, i) => ({
        matriculaId: matricula.id,
        mes: i + 1,
        ano: new Date().getFullYear(),
        valor,
        vencimento: new Date(new Date().getFullYear(), i, 10),
        situacao: "PENDENTE" as const,
      })),
    });

    await tx.logAtividade.create({
      data: {
        acao: "Matrícula confirmada",
        entidade: "Aluno",
        entidadeId: novoAluno.id,
        usuario: session.user.name ?? "Usuário",
      },
    });

    return novoAluno;
  });

  return NextResponse.json(aluno, { status: 201 });
}
