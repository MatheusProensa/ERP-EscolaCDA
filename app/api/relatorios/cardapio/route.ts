import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { respostaPDF, nomeArquivoPdf } from "@/lib/gerarRelatorioPdf";
import { gerarCardapioPdf, type PublicoParaPdf } from "@/lib/gerarCardapioPdf";
import { PUBLICOS_CARDAPIO, MESES_CARDAPIO, DIA_LABEL_CARDAPIO } from "@/components/modules/cardapio/constants";
import type { BadgeVariant } from "@/components/ui/Badge";
import { gerarEsqueletoSemanas } from "@/components/modules/cardapio/esqueleto";
import type { ItemCardapioMes, SemanasCardapio } from "@/components/modules/cardapio/types";
import { hojeBrasilia } from "@/lib/utils";

// Mesma cor de identidade de cada público usada na tela (BADGE_VARIANT_STYLE
// via CSS var) — convertida pro hex real, já que o PDF não lê variável CSS.
const COR_PUBLICO_HEX: Record<BadgeVariant, string> = {
  cat1: "#1a6fd8", cat2: "#0b7a70", cat3: "#7c3aed", cat4: "#be1e63", cat5: "#b5670c", cat6: "#4a5b7d",
  success: "#16a34a", warning: "#d97706", critical: "#ea580c", danger: "#dc2626", info: "#1a6fd8", neutral: "#3d4a63",
  green: "#16a34a", red: "#dc2626", amber: "#d97706", blue: "#1a6fd8", purple: "#7c3aed", teal: "#0b7a70", pink: "#be1e63", gray: "#3d4a63",
  count: "#3d4a63",
};

/** Exporta o cardápio do mês — o "Cardápio completo" (os 3 públicos) ou só um
 * público específico (?publico=BERCARIO, por exemplo), em PDF (com o
 * timbrado oficial) ou CSV (uma linha por refeição/dia, pra quem quiser
 * abrir numa planilha). Público sem nada cadastrado ainda entra do mesmo
 * jeito que a tela mostra: a grade com os dias certos do mês, itens em
 * branco — nunca inventa conteúdo. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const hoje = hojeBrasilia();
  const ano = Number(params.get("ano")) || hoje.getUTCFullYear();
  const mes = Number(params.get("mes")) || hoje.getUTCMonth() + 1;
  const publicoFiltro = params.get("publico");
  const mesLabel = MESES_CARDAPIO[mes - 1];

  const publicosAlvo = publicoFiltro ? PUBLICOS_CARDAPIO.filter((p) => p.valor === publicoFiltro) : PUBLICOS_CARDAPIO;
  if (publicosAlvo.length === 0) {
    return NextResponse.json({ error: "Público inválido" }, { status: 400 });
  }

  const blocosRaw = await prisma.cardapioMes.findMany({
    where: { ano, mes, publico: { in: publicosAlvo.map((p) => p.valor as never) } },
  });
  const blocos = blocosRaw as unknown as ItemCardapioMes[];
  const porPublico = new Map(blocos.map((b) => [b.publico, b]));

  const publicosParaPdf: PublicoParaPdf[] = publicosAlvo.map((p) => {
    const item = porPublico.get(p.valor);
    const esqueleto = gerarEsqueletoSemanas(p.valor, ano, mes);
    const semanas: SemanasCardapio = {
      impar: item && item.semanas.impar.length > 0 ? item.semanas.impar : esqueleto.impar,
      par: item && item.semanas.par.length > 0 ? item.semanas.par : esqueleto.par,
    };
    return { label: p.label, notaPublico: p.nota, corHex: COR_PUBLICO_HEX[p.cor], semanas };
  });

  const subtitulo = publicoFiltro ? publicosAlvo[0].label : "Cardápio completo";
  const nomeArquivo = `Cardápio ${mesLabel} ${ano} - ${subtitulo}`;

  if (params.get("formato") === "pdf") {
    const dataUri = await gerarCardapioPdf({ mesLabel, ano, publicos: publicosParaPdf });
    return respostaPDF(dataUri, nomeArquivoPdf(nomeArquivo));
  }

  const linhas: Record<string, string>[] = [];
  for (const publico of publicosParaPdf) {
    for (const [padrao, dias] of [["Semanas 1 e 3", publico.semanas.impar], ["Semanas 2 e 4", publico.semanas.par]] as const) {
      for (const dia of dias) {
        for (const ref of dia.refeicoes) {
          linhas.push({
            Público: publico.label,
            Padrão: padrao,
            Dia: DIA_LABEL_CARDAPIO[dia.dia] ?? dia.dia,
            Datas: dia.datas.join(" · "),
            Refeição: ref.label,
            Horário: ref.horario,
            Itens: ref.itens.replace(/\n/g, "; "),
          });
        }
      }
    }
  }
  const csv = paraCSV(linhas, ["Público", "Padrão", "Dia", "Datas", "Refeição", "Horário", "Itens"]);
  return respostaCSV(csv, `${nomeArquivo}.csv`);
}
