import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { gerarRelatorioPdf, respostaPDF } from "@/lib/gerarRelatorioPdf";
import { formatarData, formatarTelefone } from "@/lib/utils";
import type { SituacaoMatricula } from "@prisma/client";

const SITUACAO_LABEL: Record<string, string> = {
  ATIVA: "Ativa",
  TRANCADA: "Trancada",
  CANCELADA: "Cancelada",
  TRANSFERIDA: "Transferida",
  CONCLUIDA: "Concluída",
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const turma = params.get("turma") || undefined;
  const situacao = params.get("situacao") || undefined;
  const busca = params.get("busca") || undefined;
  const censoIncompleto = params.get("censo") === "incompleto";

  const anoLetivo = await getAnoLetivoAtivo();

  const matriculas = await prisma.matricula.findMany({
    where: {
      anoLetivoId: anoLetivo?.id,
      turmaId: turma,
      situacao: (situacao as SituacaoMatricula) || undefined,
      aluno: {
        nome: busca ? { contains: busca, mode: "insensitive" } : undefined,
        OR: censoIncompleto ? [{ racaCor: null }, { filiacao1: null }, { sexo: null }] : undefined,
      },
    },
    include: { aluno: { include: { responsaveis: true } }, turma: true },
    orderBy: { aluno: { nome: "asc" } },
  });

  const linhas = matriculas.map((m) => {
    const responsavel = m.aluno.responsaveis[0];
    return {
      Nome: m.aluno.nome,
      DataNascimento: formatarData(m.aluno.dataNascimento),
      Turma: m.turma.nome,
      Situacao: SITUACAO_LABEL[m.situacao] ?? m.situacao,
      Responsavel: responsavel?.nome ?? "",
      Telefone: responsavel ? formatarTelefone(responsavel.telefone) : "",
      Endereco: m.aluno.endereco ?? "",
      Cidade: m.aluno.cidade ?? "",
    };
  });

  const filtrosAplicados: string[] = [];
  if (turma) {
    const nomeTurma = matriculas[0]?.turma.nome ?? (await prisma.turma.findUnique({ where: { id: turma } }))?.nome;
    if (nomeTurma) filtrosAplicados.push(`Turma: ${nomeTurma}`);
  }
  if (situacao) filtrosAplicados.push(`Situação: ${SITUACAO_LABEL[situacao] ?? situacao}`);
  if (busca) filtrosAplicados.push(`Busca: "${busca}"`);
  if (censoIncompleto) filtrosAplicados.push("Censo incompleto");

  const subtitulo =
    filtrosAplicados.length > 0
      ? `${linhas.length} aluno(s) — ${filtrosAplicados.join(" · ")}`
      : `${linhas.length} aluno(s) cadastrado(s)`;

  const data = new Date().toISOString().slice(0, 10);
  const sufixoArquivo = filtrosAplicados.length > 0 ? "_filtrado" : "";

  if (params.get("formato") === "pdf") {
    const pdf = await gerarRelatorioPdf({
      titulo: "Histórico de alunos",
      subtitulo,
      colunas: [
        { chave: "Nome", label: "Nome", largura: 150 },
        { chave: "DataNascimento", label: "Nascimento", largura: 80 },
        { chave: "Turma", label: "Turma", largura: 110 },
        { chave: "Situacao", label: "Situação", largura: 80 },
        { chave: "Responsavel", label: "Responsável", largura: 130 },
        { chave: "Telefone", label: "Telefone", largura: 95 },
        { chave: "Endereco", label: "Endereço", largura: 130 },
        { chave: "Cidade", label: "Cidade", largura: 90 },
      ],
      linhas,
    });
    return respostaPDF(pdf, `historico_alunos${sufixoArquivo}_${data}.pdf`);
  }

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

  return respostaCSV(csv, `historico_alunos${sufixoArquivo}_${data}.csv`);
}
