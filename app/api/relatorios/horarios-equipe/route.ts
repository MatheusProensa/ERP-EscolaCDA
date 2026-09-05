import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { respostaPDF, nomeArquivoPdf } from "@/lib/gerarRelatorioPdf";
import { gerarHorariosEquipePdf } from "@/lib/gerarHorariosEquipePdf";
import type { ItemEscalaBloco } from "@/components/modules/horarios-equipe/types";

/** Exporta a escala do ano — PDF com o timbrado oficial (igual ao Cardápio) ou
 * CSV (uma linha por pessoa/entrada-saída, pra quem quiser abrir numa
 * planilha). Os blocos de aviso (tipo NOTA) só entram no PDF — texto livre
 * não vira linha de planilha sem inventar uma estrutura que não existe. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const ano = Number(params.get("ano")) || new Date().getFullYear();

  const blocosRaw = await prisma.escalaEquipeBloco.findMany({ where: { ano }, orderBy: { ordem: "asc" } });
  const blocos = blocosRaw as unknown as ItemEscalaBloco[];

  const nomeArquivo = `Horários da Equipe - ${ano}`;

  if (params.get("formato") === "pdf") {
    const dataUri = await gerarHorariosEquipePdf({ ano, blocos });
    return respostaPDF(dataUri, nomeArquivoPdf(nomeArquivo));
  }

  const linhas: Record<string, string>[] = [];
  for (const bloco of blocos.filter((b) => b.tipo === "TURNO")) {
    for (const [tipoEvento, itens] of [["Entrada", bloco.entradas ?? []], ["Saída", bloco.saidas ?? []]] as const) {
      for (const item of itens) {
        linhas.push({
          Turno: bloco.titulo,
          Tipo: tipoEvento,
          Horário: item.horario ?? "",
          Pessoa: item.pessoa,
          Nota: item.nota ?? "",
        });
      }
    }
  }
  const csv = paraCSV(linhas, ["Turno", "Tipo", "Horário", "Pessoa", "Nota"]);
  return respostaCSV(csv, `${nomeArquivo}.csv`);
}
