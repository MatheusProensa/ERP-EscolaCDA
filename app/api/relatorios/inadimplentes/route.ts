import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { gerarRelatorioPdf, respostaPDF } from "@/lib/gerarRelatorioPdf";
import { diasEmAtraso, formatarData, formatarTelefone } from "@/lib/utils";
import { saldoDevedor, whereAtrasadas } from "@/lib/inadimplencia";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const mensalidades = await prisma.mensalidade.findMany({
    where: whereAtrasadas(),
    include: {
      pagamentos: true,
      matricula: {
        include: {
          aluno: {
            select: { nome: true, responsaveis: { select: { nome: true, telefone: true }, take: 1 } },
          },
          turma: { select: { nome: true } },
        },
      },
    },
    orderBy: { vencimento: "asc" },
  });

  const linhas = mensalidades
    .filter((m) => saldoDevedor(m) > 0)
    .map((m) => {
      const responsavel = m.matricula.aluno.responsaveis[0];
      return {
        Aluno: m.matricula.aluno.nome,
        Turma: m.matricula.turma.nome,
        Responsavel: responsavel?.nome ?? "",
        Telefone: responsavel ? formatarTelefone(responsavel.telefone) : "",
        Referencia: `${m.mes}/${m.ano}`,
        Vencimento: formatarData(m.vencimento),
        Valor: saldoDevedor(m).toFixed(2).replace(".", ","),
        DiasAtraso: diasEmAtraso(m.vencimento),
      };
    });

  const data = new Date().toISOString().slice(0, 10);

  if (request.nextUrl.searchParams.get("formato") === "pdf") {
    const pdf = await gerarRelatorioPdf({
      titulo: "Inadimplentes",
      subtitulo: `${linhas.length} mensalidade(s) em atraso`,
      colunas: [
        { chave: "Aluno", label: "Aluno", largura: 160 },
        { chave: "Turma", label: "Turma", largura: 110 },
        { chave: "Responsavel", label: "Responsável", largura: 150 },
        { chave: "Telefone", label: "Telefone", largura: 100 },
        { chave: "Referencia", label: "Ref.", largura: 60 },
        { chave: "Vencimento", label: "Vencimento", largura: 80 },
        { chave: "Valor", label: "Valor (R$)", largura: 80 },
        { chave: "DiasAtraso", label: "Dias atraso", largura: 80 },
      ],
      linhas: linhas.map((l) => ({ ...l, DiasAtraso: String(l.DiasAtraso) })),
    });
    return respostaPDF(pdf, `inadimplentes_${data}.pdf`);
  }

  const csv = paraCSV(linhas, [
    "Aluno",
    "Turma",
    "Responsavel",
    "Telefone",
    "Referencia",
    "Vencimento",
    "Valor",
    "DiasAtraso",
  ]);

  return respostaCSV(csv, `inadimplentes_${data}.csv`);
}
