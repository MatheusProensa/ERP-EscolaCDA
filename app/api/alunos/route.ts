import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const filtro = req.nextUrl.searchParams.get("filtro");
  const where =
    filtro === "incompleto-censo"
      ? {
          matriculas: { some: { situacao: "ATIVA" as const } },
          OR: [{ racaCor: null }, { filiacao1: null }, { sexo: null }],
        }
      : {};

  const alunos = await prisma.aluno.findMany({
    where,
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
    nomeSocial,
    sexo,
    racaCor,
    povoIndigena,
    nacionalidade,
    municipioNasc,
    ufNasc,
    filiacao1,
    filiacao2,
    bolsaFamilia,
    deficiencia,
    tipoDeficiencia,
    recursosAcessib,
    nis,
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

  try {
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
          nomeSocial: nomeSocial || null,
          sexo: sexo || null,
          racaCor: racaCor || null,
          povoIndigena: povoIndigena || null,
          nacionalidade: nacionalidade || "BRASILEIRA",
          municipioNasc: municipioNasc || null,
          ufNasc: ufNasc || null,
          filiacao1: filiacao1 || null,
          filiacao2: filiacao2 || null,
          bolsaFamilia: !!bolsaFamilia,
          deficiencia: !!deficiencia,
          tipoDeficiencia: tipoDeficiencia || null,
          recursosAcessib: recursosAcessib || null,
          nis: nis || null,
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
  } catch (err) {
    return erroApi(err);
  }
}
