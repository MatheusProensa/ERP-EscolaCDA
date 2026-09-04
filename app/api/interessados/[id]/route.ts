import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { formatarNomePessoa } from "@/lib/utils";

const STATUS = [
  "AGUARDANDO",
  "CONTATADO",
  "CHAMAR_NOVAMENTE",
  "NAO_RESPONDEU",
  "PORTAS_ABERTAS",
  "SEM_RETORNO_APOS_VISITA",
  "NAO_TEM_INTERESSE",
  "VALOR_ULTRAPASSA",
  "MATRICULADO",
  "DESISTIU",
] as const;

// Edição completa — usado pelo modal de editar interessado (todos os campos
// que a Duda preenchia no Canva). PATCH continua aceitando só o status, pra
// quem só quer mudar o andamento direto na tabela sem abrir o modal.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const {
    nomeCrianca,
    foto,
    dataNascimento,
    nomeResponsavel,
    parentescoContato,
    telefoneResponsavel,
    emailResponsavel,
    turmaDesejadaId,
    interesseTexto,
    dataPrimeiroContato,
    oQueBusca,
    dataVisita,
    observacoes,
    status,
  } = body;

  if (!nomeCrianca?.trim() || !nomeResponsavel?.trim() || !telefoneResponsavel?.trim()) {
    return NextResponse.json({ error: "Nome da criança, nome e telefone do responsável são obrigatórios" }, { status: 400 });
  }
  if (status !== undefined && !STATUS.includes(status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }

  try {
    const item = await prisma.listaEspera.update({
      where: { id },
      data: {
        nomeCrianca: formatarNomePessoa(nomeCrianca),
        foto: foto || null,
        dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
        nomeResponsavel: formatarNomePessoa(nomeResponsavel),
        parentescoContato: parentescoContato?.trim() || null,
        telefoneResponsavel,
        emailResponsavel: emailResponsavel || null,
        turmaDesejadaId: turmaDesejadaId || null,
        interesseTexto: interesseTexto?.trim() || null,
        dataPrimeiroContato: dataPrimeiroContato ? new Date(dataPrimeiroContato) : null,
        oQueBusca: oQueBusca?.trim() || null,
        dataVisita: dataVisita ? new Date(dataVisita) : null,
        observacoes: observacoes?.trim() || null,
        status: status || undefined,
      },
    });
    return NextResponse.json(item);
  } catch (err) {
    return erroApi(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status, observacoes } = body;

  if (status !== undefined && !STATUS.includes(status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }

  try {
    const item = await prisma.listaEspera.update({
      where: { id },
      data: {
        status: status || undefined,
        observacoes: observacoes !== undefined ? observacoes || null : undefined,
      },
    });
    return NextResponse.json(item);
  } catch (err) {
    return erroApi(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.listaEspera.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
