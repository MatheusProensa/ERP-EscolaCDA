import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcularMes, type RegistroPontoDia } from "@/lib/ponto";
import { inicioMes, fimMes, salvarRegistrosDoMes, type LinhaPonto } from "@/lib/pontoWrite";

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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ funcionarioId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { funcionarioId } = await params;
  const body = await request.json();
  const mes = Number(body.mes);
  const ano = Number(body.ano);
  const linhas: LinhaPonto[] = body.registros ?? [];

  const funcionario = await prisma.funcionario.findUnique({ where: { id: funcionarioId } });
  if (!funcionario) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });

  // Upsert em lote (1 round-trip) em vez de um upsert por dia do mês (até 31
  // round-trips sequenciais dentro da mesma transação) — era o principal
  // motivo de "Salvar" na folha de ponto demorar visivelmente.
  await salvarRegistrosDoMes(funcionarioId, mes, ano, linhas);

  return NextResponse.json({ ok: true });
}
