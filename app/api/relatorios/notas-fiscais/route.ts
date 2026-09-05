import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { gerarRelatorioPdf, respostaPDF, nomeArquivoPdf, type ColunaRelatorio } from "@/lib/gerarRelatorioPdf";
import { formatarData, formatarMoeda, formatarCompetencia } from "@/lib/utils";

// Mesmo rótulo usado em NotasFiscaisTable.tsx — duplicado de propósito, mesmo
// padrão de outros geradores de PDF do sistema.
const STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  EMITIDA: "Emitida",
  ERRO: "Erro",
  CANCELADA: "Cancelada",
};

/** Exporta as notas fiscais lançadas — vale como relatório mesmo com a
 * emissão de verdade (ISS.net) ainda pendente. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const notas = await prisma.notaFiscal.findMany({
    include: { aluno: { select: { nome: true } } },
    orderBy: { createdAt: "desc" },
  });

  const nomeArquivo = "Notas Fiscais";
  const linhas = notas.map((n) => ({
    Aluno: n.aluno.nome,
    Competência: formatarCompetencia(n.competencia),
    "Valor do serviço": formatarMoeda(n.valorServico),
    Discriminação: n.discriminacao,
    Status: STATUS_LABEL[n.status] ?? n.status,
    "Número/série": n.numeroNota ? `${n.numeroNota}${n.serieNota ? "/" + n.serieNota : ""}` : "—",
    Emissão: n.dataEmissao ? formatarData(n.dataEmissao) : "—",
  }));

  const { searchParams } = new URL(req.url);
  if (searchParams.get("formato") === "pdf") {
    const colunas: ColunaRelatorio[] = [
      { chave: "Aluno", label: "Aluno", largura: 130 },
      { chave: "Competência", label: "Competência", largura: 75 },
      { chave: "Valor do serviço", label: "Valor do serviço", largura: 85 },
      { chave: "Discriminação", label: "Discriminação", largura: 160 },
      { chave: "Status", label: "Status", largura: 75 },
      { chave: "Número/série", label: "Número/série", largura: 85 },
      { chave: "Emissão", label: "Emissão", largura: 70 },
    ];
    const dataUri = await gerarRelatorioPdf({
      titulo: "Notas Fiscais",
      subtitulo: "NFS-e via ISS.net (Prefeitura de Santa Maria)",
      colunas,
      linhas,
    });
    return respostaPDF(dataUri, nomeArquivoPdf(nomeArquivo));
  }

  const csv = paraCSV(linhas, ["Aluno", "Competência", "Valor do serviço", "Discriminação", "Status", "Número/série", "Emissão"]);
  return respostaCSV(csv, `${nomeArquivo}.csv`);
}
