import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { gerarRelatorioPdf, respostaPDF } from "@/lib/gerarRelatorioPdf";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const anoLetivo = await getAnoLetivoAtivo();
  const anoAtual = anoLetivo?.ano ?? new Date().getFullYear();

  const mensalidades = await prisma.mensalidade.findMany({
    where: { ano: anoAtual, matricula: { anoLetivoId: anoLetivo?.id } },
    include: { pagamentos: true },
  });

  const linhas = MESES.map((mes, i) => {
    const doMes = mensalidades.filter((m) => m.mes === i + 1 && m.situacao !== "CANCELADA");
    const previsto = doMes.reduce((acc, m) => acc + m.valor, 0);
    const recebido = doMes.reduce((acc, m) => acc + m.pagamentos.reduce((a, p) => a + p.valor, 0), 0);
    return {
      Mes: mes,
      Ano: anoAtual,
      Previsto: previsto.toFixed(2).replace(".", ","),
      Recebido: recebido.toFixed(2).replace(".", ","),
      TaxaRecebimento: previsto > 0 ? `${((recebido / previsto) * 100).toFixed(1)}%` : "0%",
    };
  });

  if (request.nextUrl.searchParams.get("formato") === "pdf") {
    const pdf = await gerarRelatorioPdf({
      titulo: "Receita mensal",
      subtitulo: `Ano letivo ${anoAtual} · previsto vs. recebido`,
      colunas: [
        { chave: "Mes", label: "Mês", largura: 130 },
        { chave: "Ano", label: "Ano", largura: 70 },
        { chave: "Previsto", label: "Previsto (R$)", largura: 120 },
        { chave: "Recebido", label: "Recebido (R$)", largura: 120 },
        { chave: "TaxaRecebimento", label: "Taxa recebimento", largura: 130 },
      ],
      linhas: linhas.map((l) => ({ ...l, Ano: String(l.Ano) })),
    });
    return respostaPDF(pdf, `receita_mensal_${anoAtual}.pdf`);
  }

  const csv = paraCSV(linhas, ["Mes", "Ano", "Previsto", "Recebido", "TaxaRecebimento"]);

  return respostaCSV(csv, `receita_mensal_${anoAtual}.csv`);
}
