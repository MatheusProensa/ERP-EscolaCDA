import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { gerarRelatorioPdfSecoesEmpilhadas, respostaPDF, nomeArquivoPdf } from "@/lib/gerarRelatorioPdf";

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

  const anoLetivo = await getAnoLetivoAtivo();
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

  const aniversariantesAlunos = Array.from(porAluno.values())
    .filter((a) => a.dataNascimento.getUTCMonth() + 1 === mesFiltro)
    .map((a) => ({
      dia: a.dataNascimento.getUTCDate(),
      Tipo: "Aluno",
      Nome: a.nome,
      Detalhe: a.turmas.join(" + "),
      Data: `${String(a.dataNascimento.getUTCDate()).padStart(2, "0")}/${String(a.dataNascimento.getUTCMonth() + 1).padStart(2, "0")}`,
      Completa: `${idade(a.dataNascimento, anoAtual)} ${idade(a.dataNascimento, anoAtual) === 1 ? "ano" : "anos"}`,
    }))
    .sort((a, b) => a.dia - b.dia)
    .map(({ dia: _dia, ...linha }) => linha);

  const aniversariantesFuncionarios = funcionarios
    .filter((f) => f.dataNascimento && f.dataNascimento.getUTCMonth() + 1 === mesFiltro)
    .map((f) => ({
      dia: f.dataNascimento!.getUTCDate(),
      Tipo: "Funcionário",
      Nome: f.nome,
      Detalhe: f.cargo,
      Data: `${String(f.dataNascimento!.getUTCDate()).padStart(2, "0")}/${String(f.dataNascimento!.getUTCMonth() + 1).padStart(2, "0")}`,
      Completa: `${idade(f.dataNascimento!, anoAtual)} ${idade(f.dataNascimento!, anoAtual) === 1 ? "ano" : "anos"}`,
    }))
    .sort((a, b) => a.dia - b.dia)
    .map(({ dia: _dia, ...linha }) => linha);

  if (params.get("formato") === "pdf") {
    const colunasAluno = [
      { chave: "Nome", label: "Nome", largura: 240 },
      { chave: "Detalhe", label: "Turma", largura: 190 },
      { chave: "Data", label: "Data", largura: 60 },
      { chave: "Completa", label: "Completa", largura: 90 },
    ];
    const colunasFuncionario = [
      { chave: "Nome", label: "Nome", largura: 240 },
      { chave: "Detalhe", label: "Cargo", largura: 190 },
      { chave: "Data", label: "Data", largura: 60 },
      { chave: "Completa", label: "Completa", largura: 90 },
    ];
    const pdf = await gerarRelatorioPdfSecoesEmpilhadas({
      titulo: `Aniversariantes de ${nomeMes}`,
      subtitulo: `${nomeMes}/${anoAtual} — ${aniversariantesAlunos.length + aniversariantesFuncionarios.length} aniversariante(s), alunos e funcionários`,
      secoes: [
        {
          titulo: "Alunos",
          subtitulo: `${nomeMes}/${anoAtual} — ${aniversariantesAlunos.length} aluno(s)`,
          colunas: colunasAluno,
          linhas: aniversariantesAlunos,
        },
        {
          titulo: "Funcionários",
          subtitulo: `${nomeMes}/${anoAtual} — ${aniversariantesFuncionarios.length} funcionário(s)`,
          colunas: colunasFuncionario,
          linhas: aniversariantesFuncionarios,
        },
      ],
    });
    return respostaPDF(pdf, nomeArquivoPdf("Aniversariantes", `${nomeMes} ${anoAtual}`));
  }

  const aniversariantes = [...aniversariantesAlunos, ...aniversariantesFuncionarios];
  const csv = paraCSV(aniversariantes, ["Tipo", "Nome", "Detalhe", "Data", "Completa"]);
  return respostaCSV(csv, `Aniversariantes - ${nomeMes} ${anoAtual}.csv`);
}
