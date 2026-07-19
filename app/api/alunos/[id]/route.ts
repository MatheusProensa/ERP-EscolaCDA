import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  } = body;

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
    },
  });

  return NextResponse.json(aluno);
}
