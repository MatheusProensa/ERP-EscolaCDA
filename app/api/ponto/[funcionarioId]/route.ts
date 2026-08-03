import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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

    // Upsert em lote (1 round-trip) em vez de um upsert por dia do mês (até 31
    // round-trips sequenciais dentro da mesma transação) — era o principal
    // motivo de "Salvar" na folha de ponto demorar visivelmente.
    if (linhas.length > 0) {
      const valores = linhas.map((linha) => {
        const data = new Date(`${linha.data}T00:00:00.000Z`);
        return Prisma.sql`(
          ${randomUUID()},
          ${funcionarioId},
          ${data},
          ${linha.entrada1 ? horaParaMin(linha.entrada1) : null},
          ${linha.saida1 ? horaParaMin(linha.saida1) : null},
          ${linha.entrada2 ? horaParaMin(linha.entrada2) : null},
          ${linha.saida2 ? horaParaMin(linha.saida2) : null},
          ${linha.entrada3 ? horaParaMin(linha.entrada3) : null},
          ${linha.saida3 ? horaParaMin(linha.saida3) : null},
          ${linha.ocorrencia ?? "NORMAL"}::"OcorrenciaPonto",
          ${linha.observacao || null},
          now(),
          now()
        )`;
      });

      await tx.$executeRaw`
        INSERT INTO "RegistroPonto"
          ("id", "funcionarioId", "data", "entrada1", "saida1", "entrada2", "saida2", "entrada3", "saida3", "ocorrencia", "observacao", "createdAt", "updatedAt")
        VALUES ${Prisma.join(valores)}
        ON CONFLICT ("funcionarioId", "data") DO UPDATE SET
          "entrada1" = EXCLUDED."entrada1",
          "saida1" = EXCLUDED."saida1",
          "entrada2" = EXCLUDED."entrada2",
          "saida2" = EXCLUDED."saida2",
          "entrada3" = EXCLUDED."entrada3",
          "saida3" = EXCLUDED."saida3",
          "ocorrencia" = EXCLUDED."ocorrencia",
          "observacao" = EXCLUDED."observacao",
          "updatedAt" = now()
      `;
    }
  });

  return NextResponse.json({ ok: true });
}
