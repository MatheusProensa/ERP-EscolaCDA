import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

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
