import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PAGE_W, PAGE_H, MARGIN, TEXT2, BLACK, embarcarImagemPublica } from "./gerarRelatorioPdf";
import { desenharRetanguloArredondado } from "@/lib/pdfFormas";
import { NUTRICIONISTA_CARDAPIO } from "@/components/modules/cardapio/constants";
import type { DiaCardapio, SemanasCardapio } from "@/components/modules/cardapio/types";

export type PublicoParaPdf = {
  label: string;
  notaPublico?: string;
  /** Cor de identidade do público (hex), mesma usada na tela. */
  corHex: string;
  semanas: SemanasCardapio;
};

/**
 * Mesmo visual "pôster" do calendário (lib/gerarCalendarioPdf.ts) — pedido
 * do dono, set/2026: fundo navy + destaques amarelos + cartão branco
 * arredondado, com a MESMA decoração real extraída do PDF do Marketing
 * (canto e ilustração de rodapé). Paisagem em vez de retrato (o cardápio é
 * uma tabela larga — 1 coluna de refeição + 5 dias — que não cabe numa
 * folha estreita), mas a linguagem visual é a mesma.
 *
 * Medidas apertadas de propósito (igual antes): o pedido original era caber
 * os 2 padrões de semana (1&3 e 2&4) de um público inteiro numa página só.
 */
const NAVY = rgb(0x0d / 255, 0x1f / 255, 0x4e / 255);
const YELLOW = rgb(0xf5 / 255, 0xc4 / 255, 0);
const WHITE = rgb(1, 1, 1);
const HEADER_BLUE = rgb(0x29 / 255, 0xab / 255, 0xe2 / 255);
const CARD_RADIUS = 10;
const PAD_CARD = 14; // respiro entre a borda do cartão branco e o conteúdo

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

/**
 * Fonte do título "CARDÁPIO" — mesma Poppins Bold do pôster do calendário
 * (lib/gerarCalendarioPdf.ts), confirmada letra a letra contra o pôster
 * original do Marketing. Duplicada aqui (não exportada de lá) pra não mexer
 * naquele arquivo — cai pra Helvetica Bold se o arquivo faltar.
 */
async function embarcarFonteTitulo(pdf: PDFDocument, fallback: PDFFont): Promise<PDFFont> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public/fonts", "Poppins-Bold.ttf"));
    return await pdf.embedFont(bytes, { subset: true });
  } catch (err) {
    console.error(`[gerarCardapioPdf] Falha ao embutir a fonte do título:`, err);
    return fallback;
  }
}

// Selo "15 anos" só faz sentido no ano de aniversário — mesma regra do
// calendário (lib/gerarCalendarioPdf.ts, ANO_ANIVERSARIO_15).
const ANO_ANIVERSARIO_15 = 2026;

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

/** Normaliza quebra de linha (\r\n ou \r solto → \n) — texto colado do
 * Windows/Word costuma vir em CRLF, e o pdf-lib não sabe codificar \r
 * sozinho ("WinAnsi cannot encode" 0x000d) quando ele sobra numa linha
 * depois de dividir só por \n. */
function normalizarQuebras(texto: string): string {
  return texto.replace(/\r\n?/g, "\n");
}

/** Pra campo de uma linha só (label, horário, nome de público, observação)
 * — sem \r nem \n, os dois são caractere de controle que o pdf-lib não
 * desenha. */
function linhaUnica(texto: string): string {
  return texto.replace(/[\r\n]+/g, " ").trim();
}

/** Quebra um texto em linhas que cabem em `maxWidth`. Os itens já vêm com uma
 * quebra por item (\n) — só entra em quebra por palavra se uma linha isolada
 * ainda assim for larga demais pra coluna. */
function quebrarLinhas(font: PDFFont, texto: string, size: number, maxWidth: number): string[] {
  const linhasBrutas = normalizarQuebras(texto).split("\n");
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

/** PDF do cardápio do mês — uma página por público, uma tabela por padrão de
 * semana (1&3 / 2&4), com quebra de página automática se o conteúdo não
 * couber. */
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
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`Cardápio ${mesLabel} ${ano} — Escola CDA`);
  pdf.setAuthor("Escola CDA");
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fonteTitulo = await embarcarFonteTitulo(pdf, fonteBold);
  const logo = await embarcarImagemPublica(pdf, ano === ANO_ANIVERSARIO_15 ? "logo-cda.png" : "logo-cda-sem-selo.png");
  // Fundo pré-composto (gradiente + decoração do canto numa imagem só, sem
  // transparência em runtime) — mesma técnica do calendário (ver comentário
  // em gerarCalendarioPdf.ts sobre o bug de transparência que isso evita),
  // versão paisagem gerada offline a partir da mesma arte extraída do PDF
  // de referência do Marketing.
  const fundoCompleto = await embarcarImagemPublica(pdf, "cardapio-fundo-completo.png");
  const decoracaoRodape = await embarcarImagemPublica(pdf, "calendario-decoracao-rodape.png");
  // O servidor roda em UTC — sem timeZone explícito, "Gerado em" saía com a
  // hora errada (3h a menos do horário de Brasília).
  const geradoEm = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  let pagina!: PDFPage;
  let y = 0;

  // A decoração amarela do fundo desce até ~137pt do topo — o cartão
  // branco precisa começar ABAIXO disso (com folga), senão a borda
  // arredondada do cartão deixa um pedaço triangular da decoração visível
  // por baixo dele perto do canto (achado real testando o próprio PDF).
  const CARD_TOPO = PAGE_H - 148;
  const CARD_BASE = 76; // espaço reservado pro rodapé (ilustração + logo + crédito)
  const CARD_ALTURA = CARD_TOPO - CARD_BASE;
  const CARD_X = MARGIN;
  const CARD_W = PAGE_W - MARGIN * 2;

  function desenharCabecalho(tituloPublico: string) {
    if (fundoCompleto) {
      pagina.drawImage(fundoCompleto, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
    } else {
      pagina.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: NAVY });
    }

    // fonteTitulo (Poppins Bold) — mesma fonte de verdade do pôster
    // original, igual ao calendário; não fonteBold (Helvetica).
    const titulo = "CARDÁPIO";
    const tituloTam = 28;
    pagina.drawText(titulo, { x: MARGIN, y: PAGE_H - 42, size: tituloTam, font: fonteTitulo, color: YELLOW });
    const subtitulo = `${mesLabel} ${ano} · ${tituloPublico}`;
    pagina.drawText(subtitulo, { x: MARGIN, y: PAGE_H - 62, size: 13, font: fonteTitulo, color: WHITE });
    const geradoTexto = `Gerado em ${geradoEm}`;
    pagina.drawText(geradoTexto, { x: MARGIN, y: PAGE_H - 78, size: 8, font: fonte, color: rgb(0.75, 0.8, 0.9) });

    // Cartão branco arredondado — todo o conteúdo (tabela) desenha em cima
    // dele; altura fixa por página, igual à referência do calendário.
    desenharRetanguloArredondado(pagina, { x: CARD_X + 1.5, yTopo: CARD_TOPO - 1.5, largura: CARD_W, altura: CARD_ALTURA, raio: CARD_RADIUS, color: rgb(0, 0, 0), opacity: 0.18 });
    desenharRetanguloArredondado(pagina, { x: CARD_X, yTopo: CARD_TOPO, largura: CARD_W, altura: CARD_ALTURA, raio: CARD_RADIUS, color: WHITE });
  }

  // Crédito da Nutricionista que monta o cardápio + as observações que ela
  // sempre manda junto (alteração só com autorização dela, frutas da
  // estação) — no rodapé, ao lado da ilustração/logo, sobre o fundo navy.
  function desenharRodape(paginaLocal: PDFPage) {
    if (decoracaoRodape) {
      const larguraAlvo = 68;
      const alturaAlvo = (decoracaoRodape.height / decoracaoRodape.width) * larguraAlvo;
      paginaLocal.drawImage(decoracaoRodape, { x: -8, y: -10, width: larguraAlvo, height: alturaAlvo });
    }
    if (logo) {
      const larguraAlvo = 82;
      const alturaAlvo = (logo.height / logo.width) * larguraAlvo;
      paginaLocal.drawImage(logo, { x: (PAGE_W - larguraAlvo) / 2, y: 16, width: larguraAlvo, height: alturaAlvo });
    }
    // Faixa própria ACIMA da ilustração/logo (não ao lado) — as observações
    // são frases completas, longas demais pra uma coluna estreita ao lado da
    // logo (achado real testando o próprio PDF: o texto ficava por baixo da
    // logo). Alinhado à esquerda, começando depois da ilustração, com a
    // largura inteira da página disponível.
    const credito = `Nutricionista: ${NUTRICIONISTA_CARDAPIO.nome} · ${NUTRICIONISTA_CARDAPIO.registro}`;
    const linhas = [credito, NUTRICIONISTA_CARDAPIO.observacoes[0], NUTRICIONISTA_CARDAPIO.observacoes[1]];
    const tamanhos = [7.5, 6.5, 6.5];
    const fontes = [fonteBold, fonte, fonte];
    let yCredito = 68;
    linhas.forEach((linha, i) => {
      paginaLocal.drawText(linha, { x: 96, y: yCredito, size: tamanhos[i], font: fontes[i], color: rgb(0.75, 0.8, 0.92) });
      yCredito -= 10;
    });
  }

  function novaPagina(tituloPublico: string) {
    pagina = pdf.addPage([PAGE_W, PAGE_H]);
    desenharCabecalho(tituloPublico);
    desenharRodape(pagina);
    y = CARD_TOPO - PAD_CARD;
  }

  const colW = (CARD_W - PAD_CARD * 2 - LABEL_COL_W) / 5;

  function desenharCabecalhoTabela(dias: DiaCardapio[]) {
    const x0 = CARD_X + PAD_CARD;
    pagina.drawRectangle({ x: x0, y: y - HEAD_ROW_H, width: CARD_W - PAD_CARD * 2, height: HEAD_ROW_H, color: HEADER_BLUE });
    pagina.drawText("REFEIÇÃO", { x: x0 + PAD_X, y: y - HEAD_ROW_H / 2 - 3, size: 7.5, font: fonteBold, color: WHITE });
    let x = x0 + LABEL_COL_W;
    for (const dia of dias) {
      // As duas linhas (dia + datas) precisam de ~10pt de distância entre as
      // bases pra não sobrepor — data no mesmo tamanho do dia, bem legível.
      pagina.drawText((DIA_LABEL_PDF[dia.dia] ?? dia.dia).toUpperCase(), { x: x + PAD_X, y: y - 10, size: 8, font: fonteBold, color: WHITE });
      if (dia.datas.length > 0) {
        pagina.drawText(dia.datas.join(" · "), { x: x + PAD_X, y: y - 20, size: 8, font: fonte, color: rgb(0.9, 0.95, 1) });
      }
      x += colW;
    }
    y -= HEAD_ROW_H;
  }

  function desenharPainel(titulo: string, dias: DiaCardapio[], tituloPublico: string) {
    const x0 = CARD_X + PAD_CARD;
    if (y - 8 - HEAD_ROW_H - (LINE_H * 2 + PAD_Y * 2) < CARD_BASE + PAD_CARD) novaPagina(tituloPublico);

    pagina.drawText(titulo, { x: x0, y, size: 9.5, font: fonteBold, color: NAVY });
    y -= 8;

    // Sem cardápio cadastrado ainda pra esse padrão de semana — avisa em vez
    // de deixar a página em branco (nunca inventa conteúdo).
    if (dias.length === 0 || dias.every((d) => d.refeicoes.length === 0)) {
      pagina.drawText("Ainda não tem cardápio cadastrado pra este padrão de semana.", {
        x: x0, y: y - 12, size: 8.5, font: fonte, color: TEXT2,
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

      if (y - alturaLinha < CARD_BASE + PAD_CARD) {
        novaPagina(tituloPublico);
        desenharCabecalhoTabela(dias);
      }

      pagina.drawRectangle({ x: x0, y: y - alturaLinha, width: CARD_W - PAD_CARD * 2, height: alturaLinha, color: misturarComBranco(corHex, 0.06) });
      pagina.drawRectangle({ x: x0, y: y - alturaLinha, width: 2.5, height: alturaLinha, color: corSolida(corHex) });

      pagina.drawText(linhaUnica(refBase.label), { x: x0 + PAD_X + 4, y: y - PAD_Y - 8, size: 8.5, font: fonteBold, color: BLACK });
      if (refBase.horario) {
        pagina.drawText(linhaUnica(refBase.horario), { x: x0 + PAD_X + 4, y: y - PAD_Y - 8 - LINE_H, size: 7, font: fonte, color: TEXT2 });
      }

      let x = x0 + LABEL_COL_W;
      linhasPorDia.forEach((linhas) => {
        linhas.forEach((linha, li) => {
          pagina.drawText(linha, { x: x + PAD_X, y: y - PAD_Y - 8 - li * LINE_H, size: FONT_SIZE, font: fonte, color: BLACK });
        });
        x += colW;
      });

      y -= alturaLinha;
      if (idx < refeicoesBase.length - 1) {
        pagina.drawLine({ start: { x: x0, y }, end: { x: x0 + CARD_W - PAD_CARD * 2, y }, thickness: 0.5, color: rgb(0.92, 0.94, 0.97) });
      }
    });

    y -= 11;
  }

  for (const publico of publicos) {
    novaPagina(publico.label);

    if (publico.notaPublico) {
      // Restrição alimentar de verdade (sem sal/açúcar) — não pode passar
      // despercebida como um texto cinza qualquer. Caixa destacada + negrito,
      // na cor de identidade do público.
      const x0 = CARD_X + PAD_CARD;
      const alturaNota = 17;
      const corAviso = "#8a4d09";
      pagina.drawRectangle({ x: x0, y: y - alturaNota, width: CARD_W - PAD_CARD * 2, height: alturaNota, color: misturarComBranco("#b5670c", 0.1) });
      pagina.drawRectangle({ x: x0, y: y - alturaNota, width: 2.5, height: alturaNota, color: corSolida("#b5670c") });
      pagina.drawText(publico.notaPublico, { x: x0 + 8, y: y - alturaNota + 5.5, size: 8, font: fonteBold, color: corSolida(corAviso) });
      // Gap medido pela baseline do próximo título (9.5pt ~7pt de ascent), não
      // só pela borda da caixa — 8pt de "gap" deixava o texto quase encostado
      // na caixa (erro já cometido antes). 13pt garante uns 5-6pt de vão real.
      y -= alturaNota + 13;
    }
    desenharPainel("Semanas 1 e 3", publico.semanas.impar, publico.label);
    desenharPainel("Semanas 2 e 4", publico.semanas.par, publico.label);
  }

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}
