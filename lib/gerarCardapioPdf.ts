import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  NAVY, YELLOW, BORDER, TEXT2, WHITE, BLACK, PAGE_W, PAGE_H, MARGIN, HEADER_H,
  embarcarLogo, desenharLogo, desenharSlogan,
} from "./gerarRelatorioPdf";
import type { DiaCardapio, SemanasCardapio } from "@/components/modules/cardapio/types";

export type PublicoParaPdf = {
  label: string;
  notaPublico?: string;
  /** Cor de identidade do público (hex), mesma usada na tela. */
  corHex: string;
  semanas: SemanasCardapio;
};

// Medidas apertadas de propósito (set/2026): o pedido foi caber os 2 padrões
// de semana (1&3 e 2&4) de um público inteiro numa página só, sem quebrar —
// cada pt economizado aqui é o que decide isso.
const LABEL_COL_W = 108;
const LINE_H = 9.5;
const FONT_SIZE = 8.5;
const PAD_X = 5;
const PAD_Y = 4;
const HEAD_ROW_H = 25;

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
  // O servidor roda em UTC — sem timeZone explícito, "Gerado em" saía com a
  // hora errada (3h a menos do horário de Brasília).
  const geradoEm = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  let pagina!: PDFPage;
  let y = 0;

  function desenharCabecalho(tituloPublico: string) {
    pagina.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: NAVY });
    pagina.drawRectangle({ x: 0, y: PAGE_H - HEADER_H - 3, width: PAGE_W, height: 3, color: YELLOW });
    desenharLogo(pagina, logo, PAGE_H);
    desenharSlogan(pagina, fonte, PAGE_H);

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
    y = PAGE_H - HEADER_H - 12;
  }

  const colW = (PAGE_W - MARGIN * 2 - LABEL_COL_W) / 5;

  function desenharCabecalhoTabela(dias: DiaCardapio[]) {
    pagina.drawRectangle({ x: MARGIN, y: y - HEAD_ROW_H, width: PAGE_W - MARGIN * 2, height: HEAD_ROW_H, color: NAVY });
    pagina.drawText("REFEIÇÃO", { x: MARGIN + PAD_X, y: y - HEAD_ROW_H / 2 - 3, size: 7.5, font: fonteBold, color: WHITE });
    let x = MARGIN + LABEL_COL_W;
    for (const dia of dias) {
      // As duas linhas (dia + datas) precisam de ~10pt de distância entre as
      // bases pra não sobrepor — data no mesmo tamanho do dia, bem legível.
      pagina.drawText((DIA_LABEL_PDF[dia.dia] ?? dia.dia).toUpperCase(), { x: x + PAD_X, y: y - 10, size: 8, font: fonteBold, color: WHITE });
      if (dia.datas.length > 0) {
        pagina.drawText(dia.datas.join(" · "), { x: x + PAD_X, y: y - 20, size: 8, font: fonte, color: rgb(0.85, 0.89, 0.96) });
      }
      x += colW;
    }
    y -= HEAD_ROW_H;
  }

  function desenharPainel(titulo: string, dias: DiaCardapio[], tituloPublico: string) {
    if (y - 10 - HEAD_ROW_H - (LINE_H * 2 + PAD_Y * 2) < MARGIN) novaPagina(tituloPublico);

    pagina.drawText(titulo, { x: MARGIN, y, size: 9.5, font: fonteBold, color: NAVY });
    y -= 10;

    // Sem cardápio cadastrado ainda pra esse padrão de semana — avisa em vez
    // de deixar a página em branco (nunca inventa conteúdo).
    if (dias.length === 0 || dias.every((d) => d.refeicoes.length === 0)) {
      pagina.drawText("Ainda não tem cardápio cadastrado pra este padrão de semana.", {
        x: MARGIN, y: y - 12, size: 8.5, font: fonte, color: TEXT2,
      });
      y -= 28;
      return;
    }

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

    y -= 9;
  }

  for (const publico of publicos) {
    novaPagina(publico.label);

    // Nome do público em destaque na página (não só pequeno no canto do
    // cabeçalho) — mesmo ajuste feito na tela: sem isso, folheando o PDF
    // impresso não dá pra saber de cara qual público é cada página.
    pagina.drawRectangle({ x: MARGIN, y: y - 16, width: 4, height: 18, color: corSolida(publico.corHex) });
    pagina.drawText(publico.label, { x: MARGIN + 12, y: y - 12, size: 15, font: fonteBold, color: NAVY });
    y -= 28;

    if (publico.notaPublico) {
      pagina.drawText(publico.notaPublico, { x: MARGIN, y, size: 7.5, font: fonte, color: TEXT2 });
      y -= 12;
    }
    desenharPainel("Semanas 1 e 3", publico.semanas.impar, publico.label);
    desenharPainel("Semanas 2 e 4", publico.semanas.par, publico.label);
  }

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}
