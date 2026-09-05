import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { gerarRelatorioPdf, respostaPDF, nomeArquivoPdf, type ColunaRelatorio } from "@/lib/gerarRelatorioPdf";
import { formatarData, formatarTelefone, dataArquivo } from "@/lib/utils";

// Lista completa de funcionários — pra RH/direção terem um PDF/CSV pra imprimir
// ou levar pra reunião. "Contatos telefônicos" (só nome+telefone, por setor,
// pra achar rápido) é o /api/relatorios/funcionarios-contatos, endpoint à parte.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const setor = params.get("setor") || undefined;

  const funcionarios = await prisma.funcionario.findMany({
    where: { setor },
    orderBy: [{ setor: "asc" }, { nome: "asc" }],
  });

  const colunas: ColunaRelatorio[] = [
    { chave: "Nome", label: "Nome", largura: 170 },
    { chave: "Setor", label: "Setor", largura: 110 },
    { chave: "Cargo", label: "Cargo", largura: 130 },
    { chave: "Telefone", label: "Telefone", largura: 100 },
    { chave: "Email", label: "E-mail", largura: 150 },
    { chave: "Admissao", label: "Admissão", largura: 75 },
    { chave: "Status", label: "Status", largura: 60 },
  ];

  const linhas = funcionarios.map((f) => ({
    Nome: f.nome,
    Setor: f.setor,
    Cargo: f.cargo,
    Telefone: f.telefone ? formatarTelefone(f.telefone) : "",
    Email: f.email ?? "",
    Admissao: formatarData(f.admissao),
    Status: f.ativo ? "Ativo" : "Inativo",
  }));

  if (params.get("formato") === "pdf") {
    const pdf = await gerarRelatorioPdf({
      titulo: "Lista de funcionários",
      subtitulo: `${linhas.length} funcionário(s)${setor ? ` — ${setor}` : ""}`,
      colunas,
      linhas,
    });
    return respostaPDF(pdf, nomeArquivoPdf("Funcionarios", dataArquivo()));
  }

  const csv = paraCSV(linhas, ["Nome", "Setor", "Cargo", "Telefone", "Email", "Admissao", "Status"]);
  return respostaCSV(csv, `Funcionarios - ${dataArquivo()}.csv`);
}
