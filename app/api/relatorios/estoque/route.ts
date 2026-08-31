import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { gerarRelatorioPdf, respostaPDF, nomeArquivoPdf } from "@/lib/gerarRelatorioPdf";
import { statusEstoque, STATUS_ESTOQUE_INFO, type StatusEstoque } from "@/lib/estoqueStatus";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const status = params.get("status") as StatusEstoque | null;
  const busca = params.get("busca")?.toLowerCase() || undefined;

  const todosItens = await prisma.itemEstoque.findMany({ orderBy: { nome: "asc" } });

  const itens = todosItens.filter((item) => {
    if (status && statusEstoque(item.quantidade, item.minimo) !== status) return false;
    if (busca && !item.nome.toLowerCase().includes(busca) && !item.categoria.toLowerCase().includes(busca)) return false;
    return true;
  });

  const linhas = itens.map((item) => ({
    Item: item.nome,
    Categoria: item.categoria,
    Unidade: item.unidade,
    Quantidade: item.quantidade,
    Minimo: item.minimo,
    Situacao: STATUS_ESTOQUE_INFO[statusEstoque(item.quantidade, item.minimo)].label,
  }));

  const filtrosAplicados: string[] = [];
  if (status) filtrosAplicados.push(`Situação: ${STATUS_ESTOQUE_INFO[status]?.label ?? status}`);
  if (busca) filtrosAplicados.push(`Busca: "${busca}"`);

  const subtitulo =
    filtrosAplicados.length > 0
      ? `${linhas.length} item(ns) — ${filtrosAplicados.join(" · ")}`
      : `${linhas.length} item(ns) cadastrado(s)`;

  const data = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
  const sufixoArquivo = filtrosAplicados.length > 0 ? "Filtrado" : "";

  if (params.get("formato") === "pdf") {
    const pdf = await gerarRelatorioPdf({
      titulo: "Estoque",
      subtitulo,
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
    return respostaPDF(pdf, nomeArquivoPdf("Relatorio de Estoque", sufixoArquivo, data));
  }

  const csv = paraCSV(linhas, ["Item", "Categoria", "Unidade", "Quantidade", "Minimo", "Situacao"]);
  return respostaCSV(csv, [`Relatorio de Estoque`, sufixoArquivo, data].filter(Boolean).join(" - ") + ".csv");
}
