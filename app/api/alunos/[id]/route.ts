import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { validarUploadDataUri } from "@/lib/validarUpload";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
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
  } = body;

  if (foto) {
    const validacao = validarUploadDataUri(foto);
    if (!validacao.ok) return NextResponse.json({ error: validacao.erro }, { status: 400 });
  }

  try {
    const aluno = await prisma.aluno.update({
      where: { id },
      data: {
        nome: nome || undefined,
        dataNascimento: dataNascimento ? new Date(dataNascimento) : undefined,
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
        autorizacaoImagem: autorizacaoImagem !== undefined ? !!autorizacaoImagem : undefined,
        nomeSocial: nomeSocial || null,
        sexo: sexo || null,
        racaCor: racaCor || null,
        povoIndigena: povoIndigena || null,
        nacionalidade: nacionalidade || undefined,
        municipioNasc: municipioNasc || null,
        ufNasc: ufNasc || null,
        filiacao1: filiacao1 || null,
        filiacao2: filiacao2 || null,
        bolsaFamilia: bolsaFamilia !== undefined ? !!bolsaFamilia : undefined,
        deficiencia: deficiencia !== undefined ? !!deficiencia : undefined,
        tipoDeficiencia: tipoDeficiencia || null,
        recursosAcessib: recursosAcessib || null,
        nis: nis || null,
      },
    });

    return NextResponse.json(aluno);
  } catch (err) {
    return erroApi(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  const aluno = await prisma.aluno.findUnique({
    where: { id },
    include: {
      matriculas: { include: { mensalidades: { include: { pagamentos: true } }, contrato: true } },
    },
  });
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  const temPagamento = aluno.matriculas.some((m) => m.mensalidades.some((x) => x.pagamentos.length > 0));
  const temContratoAssinado = aluno.matriculas.some((m) => m.contrato?.assinado);
  if (temPagamento || temContratoAssinado) {
    return NextResponse.json(
      {
        error:
          "Não é possível excluir: esse aluno já tem pagamento registrado ou contrato assinado. Tranque ou cancele a matrícula em vez de excluir o cadastro.",
      },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const m of aluno.matriculas) {
        await tx.mensalidade.deleteMany({ where: { matriculaId: m.id } });
        if (m.contrato) await tx.contrato.delete({ where: { id: m.contrato.id } });
      }
      await tx.matricula.deleteMany({ where: { alunoId: id } });
      await tx.responsavel.deleteMany({ where: { alunoId: id } });
      await tx.aluno.delete({ where: { id } });

      await tx.logAtividade.create({
        data: {
          acao: `Aluno excluído - ${aluno.nome}`,
          entidade: "Aluno",
          entidadeId: id,
          usuario: session.user.name ?? "Usuário",
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
