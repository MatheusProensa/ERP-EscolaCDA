import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { statusEstoque, STATUS_ESTOQUE_INFO } from "@/lib/estoqueStatus";

export async function GET() {
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

  const csv = paraCSV(linhas, ["Item", "Categoria", "Unidade", "Quantidade", "Minimo", "Situacao"]);
  return respostaCSV(csv, `estoque_${new Date().toISOString().slice(0, 10)}.csv`);
}
