import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { gerarRelatorioPdf, respostaPDF } from "@/lib/gerarRelatorioPdf";

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

  const aniversariantes = [
    ...Array.from(porAluno.values())
      .filter((a) => a.dataNascimento.getUTCMonth() + 1 === mesFiltro)
      .map((a) => ({
        dia: a.dataNascimento.getUTCDate(),
        Tipo: "Aluno",
        Nome: a.nome,
        Detalhe: a.turmas.join(" + "),
        Data: `${String(a.dataNascimento.getUTCDate()).padStart(2, "0")}/${String(a.dataNascimento.getUTCMonth() + 1).padStart(2, "0")}`,
        Completa: `${idade(a.dataNascimento, anoAtual)} ${idade(a.dataNascimento, anoAtual) === 1 ? "ano" : "anos"}`,
      })),
    ...funcionarios
      .filter((f) => f.dataNascimento && f.dataNascimento.getUTCMonth() + 1 === mesFiltro)
      .map((f) => ({
        dia: f.dataNascimento!.getUTCDate(),
        Tipo: "Funcionário",
        Nome: f.nome,
        Detalhe: `${f.cargo} · ${f.setor}`,
        Data: `${String(f.dataNascimento!.getUTCDate()).padStart(2, "0")}/${String(f.dataNascimento!.getUTCMonth() + 1).padStart(2, "0")}`,
        Completa: `${idade(f.dataNascimento!, anoAtual)} ${idade(f.dataNascimento!, anoAtual) === 1 ? "ano" : "anos"}`,
      })),
  ]
    .sort((a, b) => a.dia - b.dia)
    .map(({ dia: _dia, ...linha }) => linha);

  const data = new Date().toISOString().slice(0, 10);

  if (params.get("formato") === "pdf") {
    const pdf = await gerarRelatorioPdf({
      titulo: `Aniversariantes de ${nomeMes}`,
      subtitulo: `${nomeMes}/${anoAtual} — ${aniversariantes.length} aniversariante(s), alunos e funcionários`,
      colunas: [
        { chave: "Nome", label: "Nome", largura: 200 },
        { chave: "Tipo", label: "Tipo", largura: 80 },
        { chave: "Detalhe", label: "Turma / Cargo", largura: 210 },
        { chave: "Data", label: "Data", largura: 60 },
        { chave: "Completa", label: "Completa", largura: 90 },
      ],
      linhas: aniversariantes,
    });
    return respostaPDF(pdf, `aniversariantes_${nomeMes.toLowerCase()}_${data}.pdf`);
  }

  const csv = paraCSV(aniversariantes, ["Tipo", "Nome", "Detalhe", "Data", "Completa"]);
  return respostaCSV(csv, `aniversariantes_${nomeMes.toLowerCase()}_${data}.csv`);
}
