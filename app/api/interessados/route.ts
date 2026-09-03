import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { formatarNomePessoa } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const lista = await prisma.listaEspera.findMany({
    include: { turmaDesejada: { select: { nome: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(lista);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const {
    nomeCrianca,
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

  try {
    const item = await prisma.listaEspera.create({
      data: {
        nomeCrianca: formatarNomePessoa(nomeCrianca),
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

    await prisma.logAtividade.create({
      data: {
        acao: `Novo interessado - ${item.nomeCrianca}`,
        entidade: "Interessado",
        entidadeId: item.id,
        usuario: session.user.name ?? "Usuário",
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    return erroApi(err);
  }
}
