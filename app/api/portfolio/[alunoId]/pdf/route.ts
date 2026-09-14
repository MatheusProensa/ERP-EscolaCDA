import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gerarPortfolioAlunoPdf, type ItemPortfolioPdf } from "@/lib/gerarPortfolioAlunoPdf";
import { respostaPDF, nomeArquivoPdf } from "@/lib/gerarRelatorioPdf";

/** Exporta o portfólio inteiro de 1 aluno em PDF (pedido do dono, set/2026:
 * "no fim do ano, exportar tudo do aluno em PDF, produto final pra entregar
 * pra família") — 1 foto por página, ordem cronológica. Qualquer um do
 * Pedagógico baixa, não só quem edita (mesma regra do resto dos exports). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ alunoId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { alunoId } = await params;

  const [aluno, itens] = await Promise.all([
    prisma.aluno.findUnique({ where: { id: alunoId }, select: { nome: true } }),
    prisma.portfolioItem.findMany({
      where: { alunoId },
      orderBy: { createdAt: "asc" },
      select: { foto: true, legenda: true, createdAt: true, turma: { select: { nome: true } } },
    }),
  ]);
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
  if (itens.length === 0) return NextResponse.json({ error: "Esse aluno ainda não tem fotos no portfólio" }, { status: 404 });

  const itensPdf: ItemPortfolioPdf[] = itens.map((i) => ({
    fotoDataUri: i.foto,
    legenda: i.legenda,
    data: i.createdAt.toISOString(),
  }));

  const dataUri = await gerarPortfolioAlunoPdf({
    alunoNome: aluno.nome,
    turmaNome: itens[itens.length - 1]?.turma.nome ?? "",
    itens: itensPdf,
  });

  return respostaPDF(dataUri, nomeArquivoPdf("Portfolio", aluno.nome));
}
