import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { gerarRelatorioPdf, respostaPDF } from "@/lib/gerarRelatorioPdf";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const hoje = new Date();
  const mesFiltro = Number(params.get("mes")) || hoje.getUTCMonth() + 1;
  const anoAtual = hoje.getUTCFullYear();

  const anoLetivo = await prisma.anoLetivo.findFirst({ where: { ativo: true } });
  const matriculas = await prisma.matricula.findMany({
    where: { situacao: "ATIVA", anoLetivoId: anoLetivo?.id },
    include: { aluno: true, turma: true },
  });

  const porAluno = new Map<string, { nome: string; dataNascimento: Date; turmas: string[] }>();
  for (const m of matriculas) {
    const existente = porAluno.get(m.alunoId);
    if (existente) {
      existente.turmas.push(m.turma.nome);
    } else {
      porAluno.set(m.alunoId, { nome: m.aluno.nome, dataNascimento: m.aluno.dataNascimento, turmas: [m.turma.nome] });
    }
  }

  const aniversariantes = Array.from(porAluno.values())
    .filter((a) => a.dataNascimento.getUTCMonth() + 1 === mesFiltro)
    .sort((a, b) => a.dataNascimento.getUTCDate() - b.dataNascimento.getUTCDate());

  const linhas = aniversariantes.map((a) => {
    const idade = anoAtual - a.dataNascimento.getUTCFullYear();
    return {
      Nome: a.nome,
      Turma: a.turmas.join(" + "),
      Data: `${String(a.dataNascimento.getUTCDate()).padStart(2, "0")}/${String(a.dataNascimento.getUTCMonth() + 1).padStart(2, "0")}`,
      Completa: `${idade} ${idade === 1 ? "ano" : "anos"}`,
    };
  });

  const nomeMes = MESES[mesFiltro - 1];
  const data = new Date().toISOString().slice(0, 10);

  if (params.get("formato") === "pdf") {
    const pdf = await gerarRelatorioPdf({
      titulo: "Aniversariantes",
      subtitulo: `${nomeMes} — ${linhas.length} aluno(s)`,
      colunas: [
        { chave: "Nome", label: "Nome", largura: 220 },
        { chave: "Turma", label: "Turma", largura: 150 },
        { chave: "Data", label: "Data", largura: 90 },
        { chave: "Completa", label: "Completa", largura: 90 },
      ],
      linhas,
    });
    return respostaPDF(pdf, `aniversariantes_${nomeMes.toLowerCase()}_${data}.pdf`);
  }

  const csv = paraCSV(linhas, ["Nome", "Turma", "Data", "Completa"]);
  return respostaCSV(csv, `aniversariantes_${nomeMes.toLowerCase()}_${data}.csv`);
}
