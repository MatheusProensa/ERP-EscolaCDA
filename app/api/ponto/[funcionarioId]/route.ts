import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcularMes, horaParaMin, type RegistroPontoDia } from "@/lib/ponto";

function inicioMes(mes: number, ano: number) {
  return new Date(Date.UTC(ano, mes - 1, 1));
}
function fimMes(mes: number, ano: number) {
  return new Date(Date.UTC(ano, mes, 1));
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ funcionarioId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { funcionarioId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const hoje = new Date();
  const mes = Number(searchParams.get("mes")) || hoje.getUTCMonth() + 1;
  const ano = Number(searchParams.get("ano")) || hoje.getUTCFullYear();

  const funcionario = await prisma.funcionario.findUnique({ where: { id: funcionarioId } });
  if (!funcionario) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });

  const inicio = inicioMes(mes, ano);
  const fim = fimMes(mes, ano);

  const [registrosAnteriores, registrosMes] = await Promise.all([
    prisma.registroPonto.findMany({ where: { funcionarioId, data: { lt: inicio } }, orderBy: { data: "asc" } }),
    prisma.registroPonto.findMany({ where: { funcionarioId, data: { gte: inicio, lt: fim } }, orderBy: { data: "asc" } }),
  ]);

  const jornada = funcionario.jornadaPrevistaMinutos ?? 0;
  const diasAnteriores = calcularMes(registrosAnteriores as RegistroPontoDia[], jornada);
  const saldoInicial = diasAnteriores.length > 0 ? diasAnteriores[diasAnteriores.length - 1].saldoAcumulado : 0;
  const diasMes = calcularMes(registrosMes as RegistroPontoDia[], jornada, saldoInicial);

  return NextResponse.json({
    funcionario: { id: funcionario.id, nome: funcionario.nome, cargo: funcionario.cargo, jornadaPrevistaMinutos: jornada },
    saldoInicial,
    dias: diasMes.map((d) => ({
      id: registrosMes.find((r) => r.data.getTime() === d.data.getTime())?.id,
      data: d.data,
      entrada1: d.pares[0].entrada,
      saida1: d.pares[0].saida,
      entrada2: d.pares[1].entrada,
      saida2: d.pares[1].saida,
      entrada3: d.pares[2].entrada,
      saida3: d.pares[2].saida,
      ocorrencia: d.ocorrencia,
      observacao: d.observacao,
      horasTrabalhadas: d.horasTrabalhadas,
      horasPrevistas: d.horasPrevistas,
      adicionalNoturno: d.adicionalNoturno,
      saldoDiario: d.saldoDiario,
      atrasoFalta: d.atrasoFalta,
      horaExtra: d.horaExtra,
      saldoAcumulado: d.saldoAcumulado,
    })),
  });
}

type LinhaEntrada = {
  id?: string;
  data: string;
  entrada1?: string | null;
  saida1?: string | null;
  entrada2?: string | null;
  saida2?: string | null;
  entrada3?: string | null;
  saida3?: string | null;
  ocorrencia?: string;
  observacao?: string | null;
};

export async function PUT(request: NextRequest, { params }: { params: Promise<{ funcionarioId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { funcionarioId } = await params;
  const body = await request.json();
  const mes = Number(body.mes);
  const ano = Number(body.ano);
  const linhas: LinhaEntrada[] = body.registros ?? [];

  const funcionario = await prisma.funcionario.findUnique({ where: { id: funcionarioId } });
  if (!funcionario) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });

  const inicio = inicioMes(mes, ano);
  const fim = fimMes(mes, ano);

  const datasEnviadas = linhas.map((l) => new Date(`${l.data}T00:00:00.000Z`).getTime());

  await prisma.$transaction(async (tx) => {
    await tx.registroPonto.deleteMany({
      where: {
        funcionarioId,
        data: { gte: inicio, lt: fim },
        NOT: { data: { in: datasEnviadas.map((t) => new Date(t)) } },
      },
    });

    for (const linha of linhas) {
      const data = new Date(`${linha.data}T00:00:00.000Z`);
      await tx.registroPonto.upsert({
        where: { funcionarioId_data: { funcionarioId, data } },
        create: {
          funcionarioId,
          data,
          entrada1: linha.entrada1 ? horaParaMin(linha.entrada1) : null,
          saida1: linha.saida1 ? horaParaMin(linha.saida1) : null,
          entrada2: linha.entrada2 ? horaParaMin(linha.entrada2) : null,
          saida2: linha.saida2 ? horaParaMin(linha.saida2) : null,
          entrada3: linha.entrada3 ? horaParaMin(linha.entrada3) : null,
          saida3: linha.saida3 ? horaParaMin(linha.saida3) : null,
          ocorrencia: (linha.ocorrencia as never) ?? "NORMAL",
          observacao: linha.observacao || null,
        },
        update: {
          entrada1: linha.entrada1 ? horaParaMin(linha.entrada1) : null,
          saida1: linha.saida1 ? horaParaMin(linha.saida1) : null,
          entrada2: linha.entrada2 ? horaParaMin(linha.entrada2) : null,
          saida2: linha.saida2 ? horaParaMin(linha.saida2) : null,
          entrada3: linha.entrada3 ? horaParaMin(linha.entrada3) : null,
          saida3: linha.saida3 ? horaParaMin(linha.saida3) : null,
          ocorrencia: (linha.ocorrencia as never) ?? "NORMAL",
          observacao: linha.observacao || null,
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
