import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { gerarRelatorioPdf, respostaPDF, nomeArquivoPdf, type ColunaRelatorio } from "@/lib/gerarRelatorioPdf";
import { formatarDataHora } from "@/lib/utils";

// Mesmo rótulo usado em app/(erp)/log-atividades/page.tsx — duplicado de
// propósito, mesmo padrão de outros geradores de PDF do sistema.
const ENTIDADE_LABEL: Record<string, string> = {
  Aluno: "Aluno",
  Matricula: "Matrícula",
  Contrato: "Contrato",
  Funcionario: "Funcionário",
  Usuario: "Usuário",
  Boleto: "Boleto",
  NotaFiscal: "Nota Fiscal",
  ListaEspera: "Interessados",
  Interessado: "Interessados",
};

/** Exporta o log de atividades — respeita os mesmos filtros de busca/tipo da
 * tela (o que muda é só que aqui não pagina, traz tudo que bate com o
 * filtro). Acesso restrito ao Admin, igual à tela. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const busca = searchParams.get("busca") ?? undefined;
  const entidade = searchParams.get("entidade") ?? undefined;

  const where = {
    AND: [
      busca ? { OR: [{ acao: { contains: busca, mode: "insensitive" as const } }, { usuario: { contains: busca, mode: "insensitive" as const } }] } : {},
      entidade ? { entidade } : {},
    ],
  };

  const logs = await prisma.logAtividade.findMany({ where, orderBy: { createdAt: "desc" } });

  const nomeArquivo = "Log de Atividades";
  const linhas = logs.map((l) => ({
    Data: formatarDataHora(l.createdAt),
    Usuário: l.usuario,
    Tipo: ENTIDADE_LABEL[l.entidade] ?? l.entidade,
    Ação: l.acao,
  }));

  if (searchParams.get("formato") === "pdf") {
    const colunas: ColunaRelatorio[] = [
      { chave: "Data", label: "Data", largura: 110 },
      { chave: "Usuário", label: "Usuário", largura: 130 },
      { chave: "Tipo", label: "Tipo", largura: 90 },
      { chave: "Ação", label: "Ação", largura: 420 },
    ];
    const dataUri = await gerarRelatorioPdf({
      titulo: "Log de Atividades",
      subtitulo: "Histórico de quem fez o quê no sistema",
      colunas,
      linhas,
    });
    return respostaPDF(dataUri, nomeArquivoPdf(nomeArquivo));
  }

  const csv = paraCSV(linhas, ["Data", "Usuário", "Tipo", "Ação"]);
  return respostaCSV(csv, `${nomeArquivo}.csv`);
}
