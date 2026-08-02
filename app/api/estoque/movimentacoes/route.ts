import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGINA = 100;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const antes = req.nextUrl.searchParams.get("antes");

  const movimentacoes = await prisma.movimentacaoEstoque.findMany({
    where: antes ? { createdAt: { lt: new Date(antes) } } : undefined,
    include: { item: true },
    orderBy: { createdAt: "desc" },
    take: PAGINA,
  });

  return NextResponse.json({ movimentacoes, temMais: movimentacoes.length === PAGINA });
}
