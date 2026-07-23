import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { formatarData, formatarTelefone } from "@/lib/utils";

const SITUACAO_LABEL: Record<string, string> = {
  ATIVA: "Ativa",
  TRANCADA: "Trancada",
  CANCELADA: "Cancelada",
  TRANSFERIDA: "Transferida",
  CONCLUIDA: "Concluída",
};

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const alunos = await prisma.aluno.findMany({
    include: {
      responsaveis: true,
      matriculas: { include: { turma: true }, orderBy: { dataMatricula: "desc" } },
    },
    orderBy: { nome: "asc" },
  });

  const linhas = alunos.map((aluno) => {
    const responsavel = aluno.responsaveis[0];
    const turmas = aluno.matriculas
      .filter((m) => m.situacao === "ATIVA")
      .map((m) => m.turma.nome)
      .join(" + ");
    return {
      Nome: aluno.nome,
      DataNascimento: formatarData(aluno.dataNascimento),
      Turma: turmas || "Sem turma ativa",
      Situacao: aluno.matriculas[0] ? SITUACAO_LABEL[aluno.matriculas[0].situacao] : "",
      Responsavel: responsavel?.nome ?? "",
      Telefone: responsavel ? formatarTelefone(responsavel.telefone) : "",
      Endereco: aluno.endereco ?? "",
      Cidade: aluno.cidade ?? "",
    };
  });

  const csv = paraCSV(linhas, [
    "Nome",
    "DataNascimento",
    "Turma",
    "Situacao",
    "Responsavel",
    "Telefone",
    "Endereco",
    "Cidade",
  ]);

  return respostaCSV(csv, `historico_alunos_${new Date().toISOString().slice(0, 10)}.csv`);
}
