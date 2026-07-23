import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcularMinutosTrabalhados } from "@/lib/ponto";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const funcionarioId = req.nextUrl.searchParams.get("funcionarioId");
  if (!funcionarioId) return NextResponse.json({ error: "funcionarioId é obrigatório" }, { status: 400 });

  const registros = await prisma.registroPonto.findMany({
    where: { funcionarioId },
    orderBy: { data: "asc" },
  });
  return NextResponse.json(registros);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { funcionarioId, data, entrada1, saida1, entrada2, saida2, entrada3, saida3, ocorrencia, observacao, minutosPrevistos } = body;

  if (!funcionarioId || !data) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const minutosTrabalhados = calcularMinutosTrabalhados(entrada1, saida1, entrada2, saida2, entrada3, saida3);

  const registro = await prisma.registroPonto.upsert({
    where: { funcionarioId_data_tipo: { funcionarioId, data: new Date(data), tipo: "MANUAL" } },
    update: {
      entrada1: entrada1 || null,
      saida1: saida1 || null,
      entrada2: entrada2 || null,
      saida2: saida2 || null,
      entrada3: entrada3 || null,
      saida3: saida3 || null,
      minutosPrevistos: Number(minutosPrevistos) || 0,
      minutosTrabalhados,
      ocorrencia: ocorrencia || "NORMAL",
      observacao: observacao || null,
    },
    create: {
      funcionarioId,
      data: new Date(data),
      entrada1: entrada1 || null,
      saida1: saida1 || null,
      entrada2: entrada2 || null,
      saida2: saida2 || null,
      entrada3: entrada3 || null,
      saida3: saida3 || null,
      minutosPrevistos: Number(minutosPrevistos) || 0,
      minutosTrabalhados,
      ocorrencia: ocorrencia || "NORMAL",
      observacao: observacao || null,
      tipo: "MANUAL",
    },
  });

  return NextResponse.json(registro, { status: 201 });
}
