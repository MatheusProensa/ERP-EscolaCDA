import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { gerarRelatorioPdfMultiSecao, respostaPDF } from "@/lib/gerarRelatorioPdf";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function idade(d: Date, ano: number) {
  return ano - d.getUTCFullYear();
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const hoje = new Date();
  const mesFiltro = Number(params.get("mes")) || hoje.getUTCMonth() + 1;
  const anoAtual = hoje.getUTCFullYear();
  const nomeMes = MESES[mesFiltro - 1];

  const anoLetivo = await prisma.anoLetivo.findFirst({ where: { ativo: true } });
  const [matriculas, funcionarios] = await Promise.all([
    prisma.matricula.findMany({
      where: { situacao: "ATIVA", anoLetivoId: anoLetivo?.id },
      include: { aluno: true, turma: true },
    }),
    prisma.funcionario.findMany({ where: { ativo: true, dataNascimento: { not: null } } }),
  ]);

  const porAluno = new Map<string, { nome: string; dataNascimento: Date; turmas: string[] }>();
  for (const m of matriculas) {
    const existente = porAluno.get(m.alunoId);
    if (existente) {
      existente.turmas.push(m.turma.nome);
    } else {
      porAluno.set(m.alunoId, { nome: m.aluno.nome, dataNascimento: m.aluno.dataNascimento, turmas: [m.turma.nome] });
    }
  }

  const linhasAlunos = Array.from(porAluno.values())
    .filter((a) => a.dataNascimento.getUTCMonth() + 1 === mesFiltro)
    .sort((a, b) => a.dataNascimento.getUTCDate() - b.dataNascimento.getUTCDate())
    .map((a) => ({
      Nome: a.nome,
      Turma: a.turmas.join(" + "),
      Data: `${String(a.dataNascimento.getUTCDate()).padStart(2, "0")}/${String(a.dataNascimento.getUTCMonth() + 1).padStart(2, "0")}`,
      Completa: `${idade(a.dataNascimento, anoAtual)} ${idade(a.dataNascimento, anoAtual) === 1 ? "ano" : "anos"}`,
    }));

  const linhasFuncionarios = funcionarios
    .filter((f) => f.dataNascimento && f.dataNascimento.getUTCMonth() + 1 === mesFiltro)
    .sort((a, b) => a.dataNascimento!.getUTCDate() - b.dataNascimento!.getUTCDate())
    .map((f) => ({
      Nome: f.nome,
      Cargo: `${f.cargo} · ${f.setor}`,
      Data: `${String(f.dataNascimento!.getUTCDate()).padStart(2, "0")}/${String(f.dataNascimento!.getUTCMonth() + 1).padStart(2, "0")}`,
      Completa: `${idade(f.dataNascimento!, anoAtual)} ${idade(f.dataNascimento!, anoAtual) === 1 ? "ano" : "anos"}`,
    }));

  const data = new Date().toISOString().slice(0, 10);

  if (params.get("formato") === "pdf") {
    const pdf = await gerarRelatorioPdfMultiSecao({
      titulo: "Aniversariantes",
      secoes: [
        {
          titulo: "Alunos",
          subtitulo: `${nomeMes} — ${linhasAlunos.length} aluno(s)`,
          colunas: [
            { chave: "Nome", label: "Nome", largura: 220 },
            { chave: "Turma", label: "Turma", largura: 170 },
            { chave: "Data", label: "Data", largura: 90 },
            { chave: "Completa", label: "Completa", largura: 90 },
          ],
          linhas: linhasAlunos,
        },
        {
          titulo: "Funcionários",
          subtitulo: `${nomeMes} — ${linhasFuncionarios.length} funcionário(s)`,
          colunas: [
            { chave: "Nome", label: "Nome", largura: 220 },
            { chave: "Cargo", label: "Cargo / Setor", largura: 220 },
            { chave: "Data", label: "Data", largura: 90 },
            { chave: "Completa", label: "Completa", largura: 90 },
          ],
          linhas: linhasFuncionarios,
        },
      ],
    });
    return respostaPDF(pdf, `aniversariantes_${nomeMes.toLowerCase()}_${data}.pdf`);
  }

  const linhasCSV = [
    ...linhasAlunos.map((l) => ({ Tipo: "Aluno", Nome: l.Nome, Detalhe: l.Turma, Data: l.Data, Completa: l.Completa })),
    ...linhasFuncionarios.map((l) => ({ Tipo: "Funcionário", Nome: l.Nome, Detalhe: l.Cargo, Data: l.Data, Completa: l.Completa })),
  ];
  const csv = paraCSV(linhasCSV, ["Tipo", "Nome", "Detalhe", "Data", "Completa"]);
  return respostaCSV(csv, `aniversariantes_${nomeMes.toLowerCase()}_${data}.csv`);
}
