import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gerarCalendarioPdf, type EventoLevePdf } from "@/lib/gerarCalendarioPdf";
import { respostaPDF } from "@/lib/gerarRelatorioPdf";
import { MESES } from "@/lib/calendario";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const ano = Number(params.get("ano"));
  const mes = Number(params.get("mes"));
  const quantidade = Math.min(24, Math.max(1, Number(params.get("quantidade")) || 1));

  if (!ano || !mes || mes < 1 || mes > 12) {
    return NextResponse.json({ error: "Informe ano e mês iniciais válidos" }, { status: 400 });
  }

  const meses: { ano: number; mes: number }[] = [];
  for (let i = 0; i < quantidade; i++) {
    const totalMeses = (mes - 1) + i;
    meses.push({ ano: ano + Math.floor(totalMeses / 12), mes: (totalMeses % 12) + 1 });
  }

  const inicio = new Date(Date.UTC(meses[0].ano, meses[0].mes - 1, 1));
  const ultimoMes = meses[meses.length - 1];
  const fim = new Date(Date.UTC(ultimoMes.ano, ultimoMes.mes, 1));

  const eventos = await prisma.eventoCalendario.findMany({
    where: { data: { gte: inicio, lt: fim } },
    select: { titulo: true, categoria: true, data: true },
    orderBy: { data: "asc" },
  });

  const eventosPorMes = new Map<string, EventoLevePdf[]>();
  for (const e of eventos) {
    const chave = `${e.data.getUTCFullYear()}-${e.data.getUTCMonth() + 1}`;
    const lista = eventosPorMes.get(chave) ?? [];
    lista.push(e);
    eventosPorMes.set(chave, lista);
  }

  const dataUri = await gerarCalendarioPdf({ meses, eventosPorMes });

  const nomeArquivo =
    quantidade === 1
      ? `calendario-${MESES[mes - 1].toLowerCase()}-${ano}.pdf`
      : `calendario-${MESES[mes - 1].toLowerCase()}-${ano}-a-${MESES[ultimoMes.mes - 1].toLowerCase()}-${ultimoMes.ano}.pdf`;

  return respostaPDF(dataUri, nomeArquivo);
}
