import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { NAVY, YELLOW, BORDER, TEXT2, WHITE, BLACK, PAGE_W, PAGE_H, MARGIN, HEADER_H, embarcarLogo, desenharLogo } from "./gerarRelatorioPdf";
import type { DiaCardapio, SemanasCardapio } from "@/components/modules/cardapio/types";

export type PublicoParaPdf = {
  label: string;
  notaPublico?: string;
  /** Cor de identidade do público (hex), mesma usada na tela. */
  corHex: string;
  semanas: SemanasCardapio;
};

const LABEL_COL_W = 116;
const LINE_H = 10;
const FONT_SIZE = 8;
const PAD_X = 6;
const PAD_Y = 6;
const HEAD_ROW_H = 28;

const DIA_LABEL_PDF: Record<string, string> = {
  SEGUNDA: "Segunda",
  TERCA: "Terça",
  QUARTA: "Quarta",
  QUINTA: "Quinta",
  SEXTA: "Sexta",
};

// Mesma cor por tipo de refeição da tela (components/modules/cardapio/constants.ts,
// COR_REFEICAO) — convertida pro hex real por trás de cada variante de Badge,
// já que o PDF não lê variável CSS nem color-mix().
const COR_REFEICAO_HEX: Record<string, string> = {
  LANCHE_MANHA: "#b5670c", // cat5
  ALMOCO: "#1a6fd8", // cat1
  LANCHE_1: "#0b7a70", // cat2
  LANCHE_2: "#be1e63", // cat4
};
const COR_REFEICAO_PADRAO = "#5a6a85";

function hexParaRgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
function corSolida(hex: string) {
  const c = hexParaRgb(hex);
  return rgb(c.r, c.g, c.b);
}
/** Mistura com branco, imitando o color-mix(... t%, white) usado na tela pra
 * tingir o fundo da linha sem perder a leitura do texto por cima. */
function misturarComBranco(hex: string, t: number) {
  const c = hexParaRgb(hex);
  return rgb(1 - (1 - c.r) * t, 1 - (1 - c.g) * t, 1 - (1 - c.b) * t);
}

/** Quebra um texto em linhas que cabem em `maxWidth`. Os itens já vêm com uma
 * quebra por item (\n) — só entra em quebra por palavra se uma linha isolada
 * ainda assim for larga demais pra coluna. */
function quebrarLinhas(font: PDFFont, texto: string, size: number, maxWidth: number): string[] {
  const linhasBrutas = texto.split("\n");
  const linhas: string[] = [];
  for (const bruta of linhasBrutas) {
    if (bruta === "") {
      linhas.push("");
      continue;
    }
    if (font.widthOfTextAtSize(bruta, size) <= maxWidth) {
      linhas.push(bruta);
      continue;
    }
    const palavras = bruta.split(" ");
    let atual = "";
    for (const palavra of palavras) {
      const tentativa = atual ? `${atual} ${palavra}` : palavra;
      if (font.widthOfTextAtSize(tentativa, size) <= maxWidth) {
        atual = tentativa;
      } else {
        if (atual) linhas.push(atual);
        atual = palavra;
      }
    }
    if (atual) linhas.push(atual);
  }
  return linhas.length > 0 ? linhas : [""];
}

/** PDF do cardápio do mês, com o timbrado oficial (mesmo cabeçalho navy +
 * logo dos outros relatórios) — uma página por público, uma tabela por
 * padrão de semana (1&3 / 2&4), com quebra de página automática se o
 * conteúdo não couber. */
export async function gerarCardapioPdf({
  mesLabel,
  ano,
  publicos,
}: {
  mesLabel: string;
  ano: number;
  publicos: PublicoParaPdf[];
}): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Cardápio ${mesLabel} ${ano} — Escola CDA`);
  pdf.setAuthor("Escola CDA");
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embarcarLogo(pdf);
  const geradoEm = new Date().toLocaleString("pt-BR");

  let pagina!: PDFPage;
  let y = 0;

  function desenharCabecalho(tituloPublico: string) {
    pagina.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: NAVY });
    pagina.drawRectangle({ x: 0, y: PAGE_H - HEADER_H - 3, width: PAGE_W, height: 3, color: YELLOW });
    desenharLogo(pagina, logo, PAGE_H);
    pagina.drawText("Onde, há 15 anos, família e escola sonham juntas", {
      x: MARGIN, y: PAGE_H - 58, size: 8.5, font: fonte, color: rgb(0.75, 0.8, 0.9),
    });

    const titulo = `Cardápio · ${mesLabel} ${ano} · ${tituloPublico}`;
    const tituloLargura = fonteBold.widthOfTextAtSize(titulo, 13);
    pagina.drawText(titulo, { x: PAGE_W - MARGIN - tituloLargura, y: PAGE_H - 28, size: 13, font: fonteBold, color: WHITE });
    const geradoTexto = `Gerado em ${geradoEm}`;
    const geradoLargura = fonte.widthOfTextAtSize(geradoTexto, 8.5);
    pagina.drawText(geradoTexto, {
      x: PAGE_W - MARGIN - geradoLargura, y: PAGE_H - 44, size: 8.5, font: fonte, color: rgb(0.75, 0.8, 0.9),
    });
  }

  function novaPagina(tituloPublico: string) {
    pagina = pdf.addPage([PAGE_W, PAGE_H]);
    desenharCabecalho(tituloPublico);
    y = PAGE_H - HEADER_H - 20;
  }

  const colW = (PAGE_W - MARGIN * 2 - LABEL_COL_W) / 5;

  function desenharCabecalhoTabela(dias: DiaCardapio[]) {
    pagina.drawRectangle({ x: MARGIN, y: y - HEAD_ROW_H, width: PAGE_W - MARGIN * 2, height: HEAD_ROW_H, color: NAVY });
    pagina.drawText("REFEIÇÃO", { x: MARGIN + PAD_X, y: y - HEAD_ROW_H / 2 - 3, size: 7.5, font: fonteBold, color: WHITE });
    let x = MARGIN + LABEL_COL_W;
    for (const dia of dias) {
      pagina.drawText((DIA_LABEL_PDF[dia.dia] ?? dia.dia).toUpperCase(), { x: x + PAD_X, y: y - 12, size: 7.5, font: fonteBold, color: WHITE });
      if (dia.datas.length > 0) {
        pagina.drawText(dia.datas.join(" · "), { x: x + PAD_X, y: y - HEAD_ROW_H + 8, size: 6.5, font: fonte, color: rgb(0.75, 0.8, 0.9) });
      }
      x += colW;
    }
    y -= HEAD_ROW_H;
  }

  function desenharPainel(titulo: string, dias: DiaCardapio[], tituloPublico: string) {
    if (dias.length === 0 || dias.every((d) => d.refeicoes.length === 0)) return;

    if (y - 16 - HEAD_ROW_H - (LINE_H * 2 + PAD_Y * 2) < MARGIN) novaPagina(tituloPublico);

    pagina.drawText(titulo, { x: MARGIN, y, size: 10.5, font: fonteBold, color: NAVY });
    y -= 16;
    desenharCabecalhoTabela(dias);

    const refeicoesBase = dias[0].refeicoes;
    refeicoesBase.forEach((refBase, idx) => {
      const corHex = COR_REFEICAO_HEX[refBase.tipo] ?? COR_REFEICAO_PADRAO;
      const linhasPorDia = dias.map((dia) => {
        const ref = dia.refeicoes.find((r) => r.tipo === refBase.tipo);
        return quebrarLinhas(fonte, ref?.itens || "—", FONT_SIZE, colW - PAD_X * 2);
      });
      const maxLinhas = Math.max(2, ...linhasPorDia.map((l) => l.length));
      const alturaLinha = maxLinhas * LINE_H + PAD_Y * 2;

      if (y - alturaLinha < MARGIN) {
        novaPagina(tituloPublico);
        desenharCabecalhoTabela(dias);
      }

      pagina.drawRectangle({ x: MARGIN, y: y - alturaLinha, width: PAGE_W - MARGIN * 2, height: alturaLinha, color: misturarComBranco(corHex, 0.06) });
      pagina.drawRectangle({ x: MARGIN, y: y - alturaLinha, width: 2.5, height: alturaLinha, color: corSolida(corHex) });

      pagina.drawText(refBase.label, { x: MARGIN + PAD_X + 4, y: y - PAD_Y - 8, size: 8.5, font: fonteBold, color: BLACK });
      if (refBase.horario) {
        pagina.drawText(refBase.horario, { x: MARGIN + PAD_X + 4, y: y - PAD_Y - 8 - LINE_H, size: 7, font: fonte, color: TEXT2 });
      }

      let x = MARGIN + LABEL_COL_W;
      linhasPorDia.forEach((linhas) => {
        linhas.forEach((linha, li) => {
          pagina.drawText(linha, { x: x + PAD_X, y: y - PAD_Y - 8 - li * LINE_H, size: FONT_SIZE, font: fonte, color: BLACK });
        });
        x += colW;
      });

      y -= alturaLinha;
      if (idx < refeicoesBase.length - 1) {
        pagina.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: BORDER });
      }
    });

    y -= 16;
  }

  for (const publico of publicos) {
    novaPagina(publico.label);
    if (publico.notaPublico) {
      pagina.drawText(publico.notaPublico, { x: MARGIN, y, size: 8, font: fonte, color: TEXT2 });
      y -= 18;
    }
    desenharPainel("Semanas 1 e 3", publico.semanas.impar, publico.label);
    desenharPainel("Semanas 2 e 4", publico.semanas.par, publico.label);
  }

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}
