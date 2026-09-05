import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { gerarRelatorioPdf, respostaPDF, nomeArquivoPdf, type ColunaRelatorio } from "@/lib/gerarRelatorioPdf";
import { formatarData, formatarTelefone } from "@/lib/utils";
import { STATUS_INTERESSADO_BADGE } from "@/lib/statusVisual";

/** Exporta o funil de Interessados inteiro — mesma ordenação da tela (contato
 * mais recente primeiro). Os filtros de busca/turma/status da tabela são só
 * client-side hoje, então o export sempre traz a lista completa; quem
 * exportar filtra na planilha/PDF se precisar de um recorte. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const itens = await prisma.listaEspera.findMany({
    include: { turmaDesejada: { select: { nome: true } } },
    orderBy: [{ dataPrimeiroContato: { sort: "desc", nulls: "last" } }],
  });

  const nomeArquivo = "Interessados";
  const linhas = itens.map((i) => ({
    Criança: i.nomeCrianca,
    Responsável: i.nomeResponsavel,
    Telefone: formatarTelefone(i.telefoneResponsavel),
    "Turma/interesse": i.turmaDesejada?.nome ?? i.interesseTexto ?? "—",
    Status: STATUS_INTERESSADO_BADGE[i.status]?.label ?? i.status,
    "1º contato": i.dataPrimeiroContato ? formatarData(i.dataPrimeiroContato) : "—",
    Visita: i.dataVisita ? formatarData(i.dataVisita) : "—",
  }));

  const { searchParams } = new URL(req.url);
  if (searchParams.get("formato") === "pdf") {
    const colunas: ColunaRelatorio[] = [
      { chave: "Criança", label: "Criança", largura: 130 },
      { chave: "Responsável", label: "Responsável", largura: 130 },
      { chave: "Telefone", label: "Telefone", largura: 90 },
      { chave: "Turma/interesse", label: "Turma/interesse", largura: 110 },
      { chave: "Status", label: "Status", largura: 130 },
      { chave: "1º contato", label: "1º contato", largura: 70 },
      { chave: "Visita", label: "Visita", largura: 70 },
    ];
    const dataUri = await gerarRelatorioPdf({
      titulo: "Interessados",
      subtitulo: "Funil de famílias interessadas — do primeiro contato até a matrícula",
      colunas,
      linhas,
    });
    return respostaPDF(dataUri, nomeArquivoPdf(nomeArquivo));
  }

  const csv = paraCSV(linhas, ["Criança", "Responsável", "Telefone", "Turma/interesse", "Status", "1º contato", "Visita"]);
  return respostaCSV(csv, `${nomeArquivo}.csv`);
}
