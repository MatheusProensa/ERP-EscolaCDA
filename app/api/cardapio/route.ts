import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PUBLICOS_CARDAPIO } from "@/components/modules/cardapio/constants";
import type { SemanasCardapio } from "@/components/modules/cardapio/types";

const SEMANAS_VAZIAS: SemanasCardapio = { impar: [], par: [] };

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const hoje = new Date();
  const ano = Number(searchParams.get("ano")) || hoje.getUTCFullYear();
  const mes = Number(searchParams.get("mes")) || hoje.getUTCMonth() + 1;

  const blocos = await prisma.cardapioMes.findMany({ where: { ano, mes } });
  return NextResponse.json(blocos);
}

/** Cria os 3 blocos (um por público) vazios pro mês, se ainda não existirem —
 * usado pelo botão "Preparar este mês" quando a Nutricionista já pode mandar
 * o próximo cardápio mas ele ainda não foi montado no sistema. Nunca inventa
 * conteúdo: cria só a "prateleira" vazia pra alguém preencher pelo editor. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const ano = Number(body.ano);
  const mes = Number(body.mes);
  if (!ano || !mes || mes < 1 || mes > 12) {
    return NextResponse.json({ error: "Ano/mês inválidos" }, { status: 400 });
  }

  await Promise.all(
    PUBLICOS_CARDAPIO.map((p) =>
      prisma.cardapioMes.upsert({
        where: { ano_mes_publico: { ano, mes, publico: p.valor as never } },
        create: { ano, mes, publico: p.valor as never, semanas: SEMANAS_VAZIAS },
        update: {},
      })
    )
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
