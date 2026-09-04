import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

// Só edição — os blocos (cards) em si são criados via SQL na implantação
// inicial (mesmo padrão do import do PDF de Interessados). Se um dia
// precisar criar/remover bloco pela tela, entra POST/DELETE aqui depois.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { titulo, horariosReferencia, entradas, saidas, conteudoLivre } = body;

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
      },
    });
    return NextResponse.json(bloco);
  } catch (err) {
    return erroApi(err);
  }
}
