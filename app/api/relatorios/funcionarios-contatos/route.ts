import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { gerarRelatorioPdfSecoesEmpilhadas, respostaPDF, nomeArquivoPdf, type ColunaRelatorio } from "@/lib/gerarRelatorioPdf";
import { formatarTelefone, agruparPorSetor, SETORES } from "@/lib/utils";

// Lista de telefones da equipe, agrupada por setor — pra imprimir/deixar na
// secretaria e achar rápido quem ligar, sem os outros dados do cadastro.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const params = request.nextUrl.searchParams;

  const funcionarios = await prisma.funcionario.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
  });
  const grupos = agruparPorSetor(funcionarios).sort(
    (a, b) => SETORES.indexOf(a.setor) - SETORES.indexOf(b.setor)
  );

  const colunas: ColunaRelatorio[] = [
    { chave: "Nome", label: "Nome", largura: 220 },
    { chave: "Cargo", label: "Cargo", largura: 180 },
    { chave: "Telefone", label: "Telefone", largura: 130 },
  ];

  function linhasDoSetor(lista: typeof funcionarios) {
    return lista.map((f) => ({
      Nome: f.nome,
      Cargo: f.cargo,
      Telefone: f.telefone ? formatarTelefone(f.telefone) : "—",
    }));
  }

  if (params.get("formato") === "pdf") {
    const pdf = await gerarRelatorioPdfSecoesEmpilhadas({
      titulo: "Contatos telefônicos da equipe",
      secoes: grupos.map((g) => ({
        titulo: g.setor,
        subtitulo: `${g.itens.length} pessoa(s)`,
        colunas,
        linhas: linhasDoSetor(g.itens),
      })),
    });
    return respostaPDF(pdf, nomeArquivoPdf("Contatos Equipe", new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")));
  }

  const linhasCSV = grupos.flatMap((g) => linhasDoSetor(g.itens).map((linha) => ({ Setor: g.setor, ...linha })));
  const csv = paraCSV(linhasCSV, ["Setor", "Nome", "Cargo", "Telefone"]);
  return respostaCSV(csv, `Contatos Equipe - ${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.csv`);
}
