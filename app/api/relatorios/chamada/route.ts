import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gerarRelatorioPdf, respostaPDF, nomeArquivoPdf, type ColunaRelatorio } from "@/lib/gerarRelatorioPdf";

const COLUNAS: ColunaRelatorio[] = [
  { chave: "nome", label: "Aluno", largura: 260 },
  { chave: "presente", label: "Presente", largura: 90 },
  { chave: "observacao", label: "Observação", largura: 240 },
];

export async function GET(request: NextRequest) {
  // Achado da auditoria ago/2026: era a única rota "de negócio" sem essa checagem
  // própria (só ficava protegida pelo middleware) — todas as outras 62 têm.
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

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
  // timeZone explícito: sem isso, o servidor (Vercel, UTC) data a chamada de
  // AMANHÃ pra quem imprimir depois das 21h em Brasília.
  const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const dataUri = await gerarRelatorioPdf({
    titulo: `Lista de Chamada — ${turma.nome}`,
    subtitulo: `Data: ${hoje}    ·    ${linhas.length} aluno(s)`,
    colunas: COLUNAS,
    linhas,
  });

  return respostaPDF(dataUri, nomeArquivoPdf("Lista de Chamada", turma.nome, hoje.replace(/\//g, "-")));
}
