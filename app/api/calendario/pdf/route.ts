import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gerarCalendarioPdf, type EventoCalendarioPdf } from "@/lib/gerarCalendarioPdf";
import { respostaPDF, nomeArquivoPdf } from "@/lib/gerarRelatorioPdf";
import { MESES } from "@/lib/calendario";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const modo = params.get("modo") === "mes" ? "mes" : "ano";
  const ano = Number(params.get("ano"));
  const mes = Number(params.get("mes"));

  if (!ano) {
    return NextResponse.json({ error: "Informe um ano válido" }, { status: 400 });
  }
  if (modo === "mes" && (!mes || mes < 1 || mes > 12)) {
    return NextResponse.json({ error: "Informe um mês válido" }, { status: 400 });
  }

  // "Ano" sempre é o ano civil completo (Jan-Dez) — nada de calcular a partir
  // de um mês inicial arbitrário, que podia empurrar meses pro ano seguinte
  // (ex.: Set/2026 + 12 meses incluía Jan-Ago/2027, calendário que nem existe
  // ainda). "Mês" é só o mês escolhido.
  const meses: { ano: number; mes: number }[] =
    modo === "mes" ? [{ ano, mes }] : Array.from({ length: 12 }, (_, i) => ({ ano, mes: i + 1 }));

  const inicio = new Date(Date.UTC(meses[0].ano, meses[0].mes - 1, 1));
  const ultimoMes = meses[meses.length - 1];
  const fim = new Date(Date.UTC(ultimoMes.ano, ultimoMes.mes, 1));

  const eventos = await prisma.eventoCalendario.findMany({
    where: { data: { gte: inicio, lt: fim } },
    select: { titulo: true, data: true, categoria: true },
    orderBy: { data: "asc" },
  });

  const eventosPorMes = new Map<string, EventoCalendarioPdf[]>();
  for (const e of eventos) {
    const chave = `${e.data.getUTCFullYear()}-${e.data.getUTCMonth() + 1}`;
    const lista = eventosPorMes.get(chave) ?? [];
    lista.push(e);
    eventosPorMes.set(chave, lista);
  }

  const dataUri = await gerarCalendarioPdf({ meses, eventosPorMes });

  const nomeArquivo =
    modo === "mes" ? nomeArquivoPdf("Calendario", `${MESES[mes - 1]} ${ano}`) : nomeArquivoPdf("Calendario", `${ano}`);

  return respostaPDF(dataUri, nomeArquivo);
}
