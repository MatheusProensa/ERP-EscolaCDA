import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PUBLICOS_CARDAPIO } from "@/components/modules/cardapio/constants";
import { comDatasDoMes } from "@/components/modules/cardapio/esqueleto";
import type { SemanasCardapio } from "@/components/modules/cardapio/types";
import { hojeBrasilia } from "@/lib/utils";

const SEMANAS_VAZIAS: SemanasCardapio = { impar: [], par: [] };

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const hoje = hojeBrasilia();
  const ano = Number(searchParams.get("ano")) || hoje.getUTCFullYear();
  const mes = Number(searchParams.get("mes")) || hoje.getUTCMonth() + 1;

  const blocos = await prisma.cardapioMes.findMany({ where: { ano, mes } });
  return NextResponse.json(blocos);
}

/** Cria os 3 blocos (um por público) pro mês, se ainda não existirem — usado
 * pelo botão "Preparar este mês". Sem `copiarDe`, cria vazio (a "prateleira"
 * pronta pra alguém preencher pelo editor, nunca inventa conteúdo). Com
 * `copiarDe: {ano,mes}`, copia as refeições/itens do mês informado — é o que
 * "Copiar do mês anterior" usa, já que setembro costuma repetir agosto quase
 * igual — só as datas de cada dia são recalculadas pro mês novo. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const ano = Number(body.ano);
  const mes = Number(body.mes);
  const copiarDe = body.copiarDe as { ano: number; mes: number } | undefined;
  if (!ano || !mes || mes < 1 || mes > 12) {
    return NextResponse.json({ error: "Ano/mês inválidos" }, { status: 400 });
  }

  const origemPorPublico = new Map<string, SemanasCardapio>();
  if (copiarDe?.ano && copiarDe?.mes) {
    const origem = await prisma.cardapioMes.findMany({ where: { ano: copiarDe.ano, mes: copiarDe.mes } });
    for (const bloco of origem) {
      origemPorPublico.set(bloco.publico, comDatasDoMes(bloco.semanas as unknown as SemanasCardapio, ano, mes));
    }
  }

  await Promise.all(
    PUBLICOS_CARDAPIO.map((p) =>
      prisma.cardapioMes.upsert({
        where: { ano_mes_publico: { ano, mes, publico: p.valor as never } },
        create: { ano, mes, publico: p.valor as never, semanas: origemPorPublico.get(p.valor) ?? SEMANAS_VAZIAS },
        update: {},
      })
    )
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}

/** Apaga os 3 blocos do mês inteiro (um por público) — desfaz o "Preparar
 * este mês" ou some com um mês cadastrado errado. Volta a tela pro estado
 * vazio (com o botão de preparar de novo). */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const ano = Number(searchParams.get("ano"));
  const mes = Number(searchParams.get("mes"));
  if (!ano || !mes || mes < 1 || mes > 12) {
    return NextResponse.json({ error: "Ano/mês inválidos" }, { status: 400 });
  }

  await prisma.cardapioMes.deleteMany({ where: { ano, mes } });
  return NextResponse.json({ ok: true });
}
