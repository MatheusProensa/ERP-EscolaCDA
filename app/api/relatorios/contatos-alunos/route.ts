import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { separarResponsaveis } from "@/lib/alunos";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { gerarRelatorioPdfSecoesEmpilhadas, respostaPDF, nomeArquivoPdf, type ColunaRelatorio } from "@/lib/gerarRelatorioPdf";
import { formatarData, formatarTelefone, ordenarTurmas } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const turmaId = params.get("turma") || undefined;

  const anoLetivo = await getAnoLetivoAtivo();
  const matriculas = await prisma.matricula.findMany({
    where: { situacao: "ATIVA", anoLetivoId: anoLetivo?.id, turmaId },
    include: { aluno: { include: { responsaveis: true } }, turma: true },
    orderBy: { aluno: { nome: "asc" } },
  });

  const porTurma = new Map<string, typeof matriculas>();
  for (const m of matriculas) {
    const lista = porTurma.get(m.turma.nome) ?? [];
    lista.push(m);
    porTurma.set(m.turma.nome, lista);
  }
  const turmasOrdenadas = ordenarTurmas(Array.from(porTurma.keys()).map((nome) => ({ nome }))).map((t) => t.nome);

  const colunas: ColunaRelatorio[] = [
    { chave: "Nome", label: "Aluno", largura: 200 },
    { chave: "Nascimento", label: "Nascimento", largura: 75 },
    { chave: "Resp1", label: "Responsável", largura: 150 },
    { chave: "Tel1", label: "Telefone", largura: 105 },
    { chave: "Resp2", label: "Responsável", largura: 150 },
    { chave: "Tel2", label: "Telefone", largura: 105 },
  ];

  function linhasDaTurma(lista: typeof matriculas) {
    return lista.map((m) => {
      const { resp1, resp2 } = separarResponsaveis(m.aluno.responsaveis);
      return {
        Nome: m.aluno.nome,
        Nascimento: formatarData(m.aluno.dataNascimento),
        Resp1: resp1 ? `${resp1.nome} (${resp1.parentesco})` : "",
        Tel1: resp1 ? formatarTelefone(resp1.telefone) : "",
        Resp2: resp2 ? `${resp2.nome} (${resp2.parentesco})` : "",
        Tel2: resp2 ? formatarTelefone(resp2.telefone) : "",
      };
    });
  }

  if (params.get("formato") === "pdf") {
    const pdf = await gerarRelatorioPdfSecoesEmpilhadas({
      titulo: "Contatos telefônicos dos alunos",
      secoes: turmasOrdenadas.map((nomeTurma) => {
        const lista = porTurma.get(nomeTurma)!;
        return {
          titulo: nomeTurma,
          subtitulo: `${lista.length} aluno(s)`,
          colunas,
          linhas: linhasDaTurma(lista),
        };
      }),
    });
    return respostaPDF(pdf, nomeArquivoPdf("Contatos Telefonicos", new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")));
  }

  const linhasCSV = turmasOrdenadas.flatMap((nomeTurma) =>
    linhasDaTurma(porTurma.get(nomeTurma)!).map((linha) => ({ Turma: nomeTurma, ...linha }))
  );
  const csv = paraCSV(linhasCSV, ["Turma", "Nome", "Nascimento", "Resp1", "Tel1", "Resp2", "Tel2"]);
  return respostaCSV(csv, `Contatos Telefonicos - ${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.csv`);
}
