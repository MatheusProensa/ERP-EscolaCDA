import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { gerarRelatorioPdf, respostaPDF, nomeArquivoPdf, type ColunaRelatorio } from "@/lib/gerarRelatorioPdf";
import { formatarDataHora } from "@/lib/utils";

/** Exporta o histórico completo de empréstimo de chaves (quem pegou, quando
 * pegou e quando devolveu) — a tela só mostra quem está com a chave AGORA,
 * então esse relatório é o único lugar que junta o histórico inteiro, tanto
 * das chaves já devolvidas quanto das em uso. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const emprestimos = await prisma.emprestimoChave.findMany({
    include: { chave: { select: { sala: true } } },
    orderBy: { retirada: "desc" },
  });

  const nomeArquivo = "Histórico de Chaves";
  const linhas = emprestimos.map((e) => ({
    Sala: e.chave.sala,
    Responsável: e.responsavel,
    Retirada: formatarDataHora(e.retirada),
    Devolução: e.devolucao ? formatarDataHora(e.devolucao) : "—",
    Status: e.devolucao ? "Devolvida" : "Em uso",
  }));

  const { searchParams } = new URL(req.url);
  if (searchParams.get("formato") === "pdf") {
    const colunas: ColunaRelatorio[] = [
      { chave: "Sala", label: "Sala", largura: 130 },
      { chave: "Responsável", label: "Responsável", largura: 160 },
      { chave: "Retirada", label: "Retirada", largura: 110 },
      { chave: "Devolução", label: "Devolução", largura: 110 },
      { chave: "Status", label: "Status", largura: 80 },
    ];
    const dataUri = await gerarRelatorioPdf({
      titulo: "Histórico de Chaves",
      subtitulo: "Controle de retirada e devolução de salas",
      colunas,
      linhas,
    });
    return respostaPDF(dataUri, nomeArquivoPdf(nomeArquivo));
  }

  const csv = paraCSV(linhas, ["Sala", "Responsável", "Retirada", "Devolução", "Status"]);
  return respostaCSV(csv, `${nomeArquivo}.csv`);
}
