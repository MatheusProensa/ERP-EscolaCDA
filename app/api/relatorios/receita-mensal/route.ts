import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paraCSV, respostaCSV } from "@/lib/csv";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const anoLetivo = await prisma.anoLetivo.findFirst({ where: { ativo: true } });
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

  const csv = paraCSV(linhas, ["Mes", "Ano", "Previsto", "Recebido", "TaxaRecebimento"]);

  return respostaCSV(csv, `receita_mensal_${anoAtual}.csv`);
}
