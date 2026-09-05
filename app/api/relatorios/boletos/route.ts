import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { gerarRelatorioPdf, respostaPDF, nomeArquivoPdf, type ColunaRelatorio } from "@/lib/gerarRelatorioPdf";
import { formatarData, formatarMoeda, formatarCompetencia } from "@/lib/utils";

// Mesmo rótulo usado em BoletosTable.tsx — duplicado aqui de propósito (é só
// um Record pequeno, mesmo padrão de outros geradores de PDF do sistema, que
// não importam mapa de um componente client pra dentro de uma rota).
const STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  REGISTRADO: "Registrado",
  ERRO: "Erro",
  PAGO: "Pago",
  CANCELADO: "Cancelado",
};

/** Exporta os boletos lançados — serve de relatório financeiro mesmo com o
 * registro automático no Banrisul ainda pendente (o lançamento local já vale
 * pra controle e prestação de contas). */
export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const boletos = await prisma.boleto.findMany({
    include: { aluno: { select: { nome: true } } },
    orderBy: { createdAt: "desc" },
  });

  const nomeArquivo = "Boletos";
  const linhas = boletos.map((b) => ({
    Aluno: b.aluno.nome,
    Competência: formatarCompetencia(b.competencia),
    Valor: formatarMoeda(b.valor),
    Vencimento: formatarData(b.vencimento),
    Status: STATUS_LABEL[b.status] ?? b.status,
    "Nosso número": b.nossoNumero ?? "—",
  }));

  const { searchParams } = new URL(req.url);
  if (searchParams.get("formato") === "pdf") {
    const colunas: ColunaRelatorio[] = [
      { chave: "Aluno", label: "Aluno", largura: 160 },
      { chave: "Competência", label: "Competência", largura: 90 },
      { chave: "Valor", label: "Valor", largura: 80 },
      { chave: "Vencimento", label: "Vencimento", largura: 80 },
      { chave: "Status", label: "Status", largura: 90 },
      { chave: "Nosso número", label: "Nosso número", largura: 110 },
    ];
    const dataUri = await gerarRelatorioPdf({
      titulo: "Boletos",
      subtitulo: "Cobrança de mensalidade via API do Banrisul",
      colunas,
      linhas,
    });
    return respostaPDF(dataUri, nomeArquivoPdf(nomeArquivo));
  }

  const csv = paraCSV(linhas, ["Aluno", "Competência", "Valor", "Vencimento", "Status", "Nosso número"]);
  return respostaCSV(csv, `${nomeArquivo}.csv`);
}
