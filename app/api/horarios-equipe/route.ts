import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const ano = Number(req.nextUrl.searchParams.get("ano")) || new Date().getFullYear();
  const blocos = await prisma.escalaEquipeBloco.findMany({
    where: { ano },
    orderBy: { ordem: "asc" },
  });
  return NextResponse.json(blocos);
}

/** Cria um bloco novo (turma/turno ou nota/aviso) — sempre em branco, pra
 * preencher depois pelo "Editar" que já existe (mesmo padrão do "Preparar em
 * branco" do Cardápio: nunca inventa entradas/saídas ou texto). Entra sempre
 * no fim da lista do ano — a posição exata dentro da seção (Turnos ou
 * Organização e avisos) se ajusta depois com "mover pra cima/baixo". */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { ano, tipo, titulo } = await req.json();
  if (!titulo?.trim()) return NextResponse.json({ error: "Título não pode ficar vazio" }, { status: 400 });
  if (tipo !== "TURNO" && tipo !== "NOTA") return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });

  try {
    const ultimo = await prisma.escalaEquipeBloco.aggregate({ where: { ano }, _max: { ordem: true } });
    const bloco = await prisma.escalaEquipeBloco.create({
      data: {
        ano,
        tipo,
        titulo: titulo.trim(),
        ordem: (ultimo._max.ordem ?? 0) + 1,
        horariosReferencia: [],
        entradas: tipo === "TURNO" ? [] : undefined,
        saidas: tipo === "TURNO" ? [] : undefined,
        conteudoLivre: tipo === "NOTA" ? "" : undefined,
      },
    });
    return NextResponse.json(bloco);
  } catch (err) {
    return erroApi(err);
  }
}
