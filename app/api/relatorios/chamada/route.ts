import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { gerarRelatorioPdf, respostaPDF, nomeArquivoPdf, type ColunaRelatorio } from "@/lib/gerarRelatorioPdf";

const COLUNAS: ColunaRelatorio[] = [
  { chave: "nome", label: "Aluno", largura: 260 },
  { chave: "presente", label: "Presente", largura: 90 },
  { chave: "observacao", label: "Observação", largura: 240 },
];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const turmaId = params.get("turma");
  if (!turmaId) return new Response("Informe a turma", { status: 400 });

  const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
  if (!turma) return new Response("Turma não encontrada", { status: 404 });

  const matriculas = await prisma.matricula.findMany({
    where: { turmaId, situacao: "ATIVA" },
    select: { aluno: { select: { nome: true } } },
    orderBy: { aluno: { nome: "asc" } },
  });

  const linhas = matriculas.map((m) => ({ nome: m.aluno.nome, presente: "", observacao: "" }));
  const hoje = new Date().toLocaleDateString("pt-BR");

  const dataUri = await gerarRelatorioPdf({
    titulo: `Lista de Chamada — ${turma.nome}`,
    subtitulo: `Data: ${hoje}    ·    ${linhas.length} aluno(s)`,
    colunas: COLUNAS,
    linhas,
  });

  return respostaPDF(dataUri, nomeArquivoPdf("Lista de Chamada", turma.nome, hoje.replace(/\//g, "-")));
}
