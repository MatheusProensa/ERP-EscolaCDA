import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { diasEmAtraso, formatarData, formatarTelefone } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const mensalidades = await prisma.mensalidade.findMany({
    where: { situacao: "ATRASADA" },
    include: {
      matricula: {
        include: { aluno: { include: { responsaveis: true } }, turma: true },
      },
    },
    orderBy: { vencimento: "asc" },
  });

  const linhas = mensalidades.map((m) => {
    const responsavel = m.matricula.aluno.responsaveis[0];
    return {
      Aluno: m.matricula.aluno.nome,
      Turma: m.matricula.turma.nome,
      Responsavel: responsavel?.nome ?? "",
      Telefone: responsavel ? formatarTelefone(responsavel.telefone) : "",
      Referencia: `${m.mes}/${m.ano}`,
      Vencimento: formatarData(m.vencimento),
      Valor: m.valor.toFixed(2).replace(".", ","),
      DiasAtraso: diasEmAtraso(m.vencimento),
    };
  });

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

  return respostaCSV(csv, `inadimplentes_${new Date().toISOString().slice(0, 10)}.csv`);
}
