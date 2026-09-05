import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { titulo, horariosReferencia, entradas, saidas, conteudoLivre, ordem } = body;

  if (titulo !== undefined && !titulo?.trim()) {
    return NextResponse.json({ error: "Título não pode ficar vazio" }, { status: 400 });
  }

  try {
    const bloco = await prisma.escalaEquipeBloco.update({
      where: { id },
      data: {
        titulo: titulo?.trim(),
        horariosReferencia: horariosReferencia ?? undefined,
        entradas: entradas ?? undefined,
        saidas: saidas ?? undefined,
        conteudoLivre: conteudoLivre !== undefined ? conteudoLivre || null : undefined,
        // Usado só pra "mover pra cima/baixo" — troca a ordem com o vizinho.
        ordem: typeof ordem === "number" ? ordem : undefined,
      },
    });
    return NextResponse.json(bloco);
  } catch (err) {
    return erroApi(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  try {
    await prisma.escalaEquipeBloco.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
