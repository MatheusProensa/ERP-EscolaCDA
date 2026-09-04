import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SemanasCardapio } from "@/components/modules/cardapio/types";

/** Atualiza só UM padrão de semana (ímpar = semanas 1 e 3, ou par = semanas 2
 * e 4) do bloco — o outro padrão fica intacto. Editar os dois juntos numa
 * tela só ficaria grande demais (5 dias x ~4 refeições x 2 padrões). */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { campo, dias } = body as { campo: "impar" | "par"; dias: SemanasCardapio["impar"] };

  if (campo !== "impar" && campo !== "par") {
    return NextResponse.json({ error: "Campo inválido" }, { status: 400 });
  }

  const atual = await prisma.cardapioMes.findUnique({ where: { id } });
  if (!atual) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const semanasAtuais = atual.semanas as unknown as SemanasCardapio;
  const semanas: SemanasCardapio = { ...semanasAtuais, [campo]: dias };

  const bloco = await prisma.cardapioMes.update({ where: { id }, data: { semanas } });
  return NextResponse.json(bloco);
}
