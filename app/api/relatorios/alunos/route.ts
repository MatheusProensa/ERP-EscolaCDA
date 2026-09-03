import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { gerarRelatorioPdf, respostaPDF, nomeArquivoPdf } from "@/lib/gerarRelatorioPdf";
import { formatarData, formatarTelefone } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const turma = params.get("turma") || undefined;
  const busca = params.get("busca") || undefined;
  const censoIncompleto = params.get("censo") === "incompleto";

  const anoLetivo = await getAnoLetivoAtivo();

  // Sempre só quem está na escola hoje — não existe filtro pra ver quem já saiu.
  const matriculas = await prisma.matricula.findMany({
    where: {
      anoLetivoId: anoLetivo?.id,
      turmaId: turma,
      situacao: "ATIVA",
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
  if (busca) filtrosAplicados.push(`Busca: "${busca}"`);
  if (censoIncompleto) filtrosAplicados.push("Censo incompleto");

  const subtitulo =
    filtrosAplicados.length > 0
      ? `${linhas.length} aluno(s) — ${filtrosAplicados.join(" · ")}`
      : `${linhas.length} aluno(s) cadastrado(s)`;

  const data = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
  const sufixoArquivo = filtrosAplicados.length > 0 ? "Filtrado" : "";

  if (params.get("formato") === "pdf") {
    const pdf = await gerarRelatorioPdf({
      titulo: "Histórico de alunos",
      subtitulo,
      colunas: [
        { chave: "Nome", label: "Nome", largura: 170 },
        { chave: "DataNascimento", label: "Nascimento", largura: 85 },
        { chave: "Turma", label: "Turma", largura: 120 },
        { chave: "Responsavel", label: "Responsável", largura: 140 },
        { chave: "Telefone", label: "Telefone", largura: 100 },
        { chave: "Endereco", label: "Endereço", largura: 140 },
        { chave: "Cidade", label: "Cidade", largura: 95 },
      ],
      linhas,
    });
    return respostaPDF(pdf, nomeArquivoPdf("Historico de Alunos", sufixoArquivo, data));
  }

  const csv = paraCSV(linhas, ["Nome", "DataNascimento", "Turma", "Responsavel", "Telefone", "Endereco", "Cidade"]);

  return respostaCSV(csv, [`Historico de Alunos`, sufixoArquivo, data].filter(Boolean).join(" - ") + ".csv");
}
