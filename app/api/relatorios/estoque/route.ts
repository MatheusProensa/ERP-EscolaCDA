import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { gerarRelatorioPdf, respostaPDF } from "@/lib/gerarRelatorioPdf";
import { statusEstoque, STATUS_ESTOQUE_INFO } from "@/lib/estoqueStatus";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const itens = await prisma.itemEstoque.findMany({ orderBy: { nome: "asc" } });

  const linhas = itens.map((item) => ({
    Item: item.nome,
    Categoria: item.categoria,
    Unidade: item.unidade,
    Quantidade: item.quantidade,
    Minimo: item.minimo,
    Situacao: STATUS_ESTOQUE_INFO[statusEstoque(item.quantidade, item.minimo)].label,
  }));

  const data = new Date().toISOString().slice(0, 10);

  if (request.nextUrl.searchParams.get("formato") === "pdf") {
    const pdf = await gerarRelatorioPdf({
      titulo: "Estoque",
      subtitulo: `${linhas.length} item(ns) cadastrado(s)`,
      colunas: [
        { chave: "Item", label: "Item", largura: 180 },
        { chave: "Categoria", label: "Categoria", largura: 130 },
        { chave: "Unidade", label: "Unidade", largura: 90 },
        { chave: "Quantidade", label: "Qtd.", largura: 70 },
        { chave: "Minimo", label: "Mínimo", largura: 70 },
        { chave: "Situacao", label: "Situação", largura: 100 },
      ],
      linhas: linhas.map((l) => ({ ...l, Quantidade: String(l.Quantidade), Minimo: String(l.Minimo) })),
    });
    return respostaPDF(pdf, `estoque_${data}.pdf`);
  }

  const csv = paraCSV(linhas, ["Item", "Categoria", "Unidade", "Quantidade", "Minimo", "Situacao"]);
  return respostaCSV(csv, `estoque_${data}.csv`);
}
