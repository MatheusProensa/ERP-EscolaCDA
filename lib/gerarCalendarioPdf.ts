import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont, type PDFImage } from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { truncar } from "@/lib/gerarRelatorioPdf";
import { MESES } from "@/lib/calendario";

/**
 * Design único de calendário em PDF — cópia fiel do pôster que o Marketing
 * desenhou no Canva pro calendário 2027 (arquivo de referência enviado pelo
 * dono, set/2026): pôster de 1 página, cartões de mês arredondados em grade,
 * fundo navy + destaques amarelos, com os MESMOS elementos gráficos do
 * original (o "borrão" amarelo decorativo do canto superior direito e a
 * ilustração de calendário+check do canto inferior esquerdo foram extraídos
 * do PDF de referência com pdfimages e reaproveitados aqui, não redesenhados
 * — é a arte de verdade, não uma aproximação).
 *
 * Vale tanto pro ano completo (12 meses numa página só) quanto pra um único
 * mês exportado avulso — mesmo formato pros dois casos, pedido do dono pra
 * não ter dois formatos de calendário no sistema. Não mostra categoria por
 * cor (só destaca o dia em amarelo + legenda embaixo de cada mês, igual à
 * referência) — pensado pra imprimir/pendurar, não pra consulta detalhada.
 */

const PAGE_W = 595; // A4 retrato (pt) — os outros PDFs do sistema são paisagem;
const PAGE_H = 842; // esse é o único pôster vertical, por isso não reaproveita
// as constantes de lib/gerarRelatorioPdf.ts (PAGE_W/PAGE_H de lá são a
// paisagem 842x595 usada em todo relatório de tabela).

const NAVY = rgb(0x0d / 255, 0x1f / 255, 0x4e / 255);
const YELLOW = rgb(0xf5 / 255, 0xc4 / 255, 0);
const WHITE = rgb(1, 1, 1);
const HEADER_BLUE = rgb(0x29 / 255, 0xab / 255, 0xe2 / 255);
const NAVY_TEXT = NAVY;
const SOMBRA = rgb(0, 0, 0);

// Medidas "base" (escala 1×) de um mini-mês, calibradas pela referência: a
// grade de dias sempre ocupa a MESMA altura total (GRADE_LINHAS_FIXAS linhas
// "de mentirinha") não importa se o mês precisa de 5 ou 6 semanas — as linhas
// reais só esticam pra preencher esse espaço. É por isso que, na referência,
// todos os cartões de uma mesma grade têm exatamente a mesma altura.
const CARD_W = 127;
const CARD_RADIUS = 6;
const HEADER_H = 18;
const CABECALHO_SEMANA_H = 10;
const GRADE_LINHAS_FIXAS = 6;
const LINHA_H = 10.5;
const GRADE_ALTURA = CABECALHO_SEMANA_H + GRADE_LINHAS_FIXAS * LINHA_H;
const CARD_H = HEADER_H + GRADE_ALTURA; // altura fixa do cartão branco (sem a legenda, que fica fora/embaixo)
const MAX_LEGENDA_ITENS = 6; // acima disso, agrupa o resto num "+N eventos"
const LEGENDA_HEADROOM = 8 + MAX_LEGENDA_ITENS * 9; // espaço reservado pra legenda embaixo do cartão
const GAP = 14;
const ESCALA_MAXIMA = 2.4; // trava pra "1 mês" não virar um cartão gigante desproporcional

export type EventoCalendarioPdf = { titulo: string; data: Date };

async function embarcarImagemPublica(pdf: PDFDocument, arquivo: string): Promise<PDFImage | null> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", arquivo));
    return await pdf.embedPng(bytes);
  } catch {
    return null;
  }
}

function diasDoMes(ano: number, mes: number): (number | null)[][] {
  const primeiroDiaSemana = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay(); // 0=Dom
  const totalDias = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const celulas: (number | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let d = 1; d <= totalDias; d++) celulas.push(d);
  const linhas: (number | null)[][] = [];
  for (let i = 0; i < celulas.length; i += 7) linhas.push(celulas.slice(i, i + 7));
  return linhas;
}

/** Quebra o título da legenda em até 2 linhas (igual à referência, que
 * quebra "FERIADO DE SEXTA-FEIRA SANTA" em vez de cortar) — se ainda assim
 * não couber, a 2ª linha termina com reticências via truncar(). */
function quebrarEm2Linhas(fonte: PDFFont, texto: string, tamanho: number, larguraMax: number): string[] {
  if (fonte.widthOfTextAtSize(texto, tamanho) <= larguraMax) return [texto];
  const palavras = texto.split(" ");
  let linha1 = "";
  let i = 0;
  for (; i < palavras.length; i++) {
    const tentativa = linha1 ? `${linha1} ${palavras[i]}` : palavras[i];
    if (fonte.widthOfTextAtSize(tentativa, tamanho) > larguraMax && linha1) break;
    linha1 = tentativa;
  }
  const resto = palavras.slice(i).join(" ");
  if (!resto) return [linha1];
  return [linha1, truncar(fonte, resto, tamanho, larguraMax)];
}

/** Agrupa dias consecutivos com o mesmo título num intervalo só ("11-12"),
 * pra legenda não repetir a mesma frase várias vezes (ex.: recesso de vários
 * dias, hoje gravado como um EventoCalendario por dia). */
function agruparEventosDoMes(eventos: { dia: number; titulo: string }[]): { rotulo: string; titulo: string }[] {
  const ordenados = [...eventos].sort((a, b) => a.dia - b.dia || a.titulo.localeCompare(b.titulo, "pt-BR"));
  const grupos: { inicio: number; fim: number; titulo: string }[] = [];
  for (const e of ordenados) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.titulo === e.titulo && e.dia === ultimo.fim + 1) {
      ultimo.fim = e.dia;
    } else {
      grupos.push({ inicio: e.dia, fim: e.dia, titulo: e.titulo });
    }
  }
  return grupos.map((g) => ({
    rotulo: g.inicio === g.fim ? String(g.inicio) : `${g.inicio}-${g.fim}`,
    titulo: g.titulo,
  }));
}

/** Caminho SVG (origem no canto superior-esquerdo, Y pra baixo — convenção
 * SVG, que é o que page.drawSvgPath espera) de um retângulo com os 4 cantos
 * arredondados. */
function retanguloArredondadoPath(w: number, h: number, r: number): string {
  const raio = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M ${raio},0 H ${w - raio} Q ${w},0 ${w},${raio} V ${h - raio} Q ${w},${h} ${w - raio},${h} H ${raio} Q 0,${h} 0,${h - raio} V ${raio} Q 0,0 ${raio},0 Z`;
}

/** Igual ao anterior, mas só os cantos de CIMA são arredondados (base reta)
 * — usado no cabeçalho azul do mini-mês, que fica colado na grade branca
 * embaixo dele. */
function retanguloTopoArredondadoPath(w: number, h: number, r: number): string {
  const raio = Math.max(0, Math.min(r, w / 2, h));
  return `M 0,${raio} Q 0,0 ${raio},0 H ${w - raio} Q ${w},0 ${w},${raio} V ${h} H 0 V ${raio} Z`;
}

function desenharRetanguloArredondado(
  pagina: PDFPage,
  { x, yTopo, largura, altura, raio, color, opacity }: { x: number; yTopo: number; largura: number; altura: number; raio: number; color: ReturnType<typeof rgb>; opacity?: number }
) {
  pagina.drawSvgPath(retanguloArredondadoPath(largura, altura, raio), { x, y: yTopo, color, opacity });
}

/** Pílula (retângulo com os cantos totalmente arredondados) — usada nos
 * chips da legenda e no destaque de dia com evento, igual à referência. */
function desenharPilula(
  pagina: PDFPage,
  { x, yTopo, largura, altura, color }: { x: number; yTopo: number; largura: number; altura: number; color: ReturnType<typeof rgb> }
) {
  desenharRetanguloArredondado(pagina, { x, yTopo, largura, altura, raio: altura / 2, color });
}

function desenharMiniMes(
  pagina: PDFPage,
  {
    x,
    yTopo,
    largura,
    escala,
    mes,
    ano,
    fonte,
    fonteBold,
    eventosDoDia,
    eventosDoMes,
  }: {
    x: number;
    yTopo: number;
    largura: number;
    escala: number;
    mes: number;
    ano: number;
    fonte: PDFFont;
    fonteBold: PDFFont;
    eventosDoDia: Set<number>;
    eventosDoMes: { dia: number; titulo: string }[];
  }
) {
  const e = escala;
  const cardH = CARD_H * e;
  const raio = CARD_RADIUS * e;

  // Sombra sutil (dá profundidade ao cartão, igual à referência)
  desenharRetanguloArredondado(pagina, { x: x + 1.5 * e, yTopo: yTopo - 1.5 * e, largura, altura: cardH, raio, color: SOMBRA, opacity: 0.18 });

  // Cartão branco — a base já cobre header + grade inteiros; o header azul
  // desenhado em seguida só ocupa a parte de cima, deixando o branco
  // aparecer naturalmente embaixo (sem precisar desenhar a grade separada).
  desenharRetanguloArredondado(pagina, { x, yTopo, largura, altura: cardH, raio, color: WHITE });

  const headerH = HEADER_H * e;
  pagina.drawSvgPath(retanguloTopoArredondadoPath(largura, headerH, raio), { x, y: yTopo, color: HEADER_BLUE });
  const nomeMes = MESES[mes - 1].toUpperCase();
  const nomeTam = 9.5 * e;
  const nomeLargura = fonteBold.widthOfTextAtSize(nomeMes, nomeTam);
  pagina.drawText(nomeMes, {
    x: x + (largura - nomeLargura) / 2,
    y: yTopo - headerH + 5.5 * e,
    size: nomeTam,
    font: fonteBold,
    color: WHITE,
  });

  // Grade de dias — a altura total é sempre a mesma (GRADE_ALTURA), então
  // meses com 5 semanas esticam um pouco mais cada linha que meses com 6.
  const linhas = diasDoMes(ano, mes);
  const colunaW = largura / 7;
  const cabecalhoSemanaH = CABECALHO_SEMANA_H * e;
  const gradeTopo = yTopo - headerH;
  const gradeAltura = GRADE_ALTURA * e;
  const linhaH = (gradeAltura - cabecalhoSemanaH) / linhas.length;

  const fonteDiaSemanaTam = 6 * e;
  "DSTQQSS".split("").forEach((letra, i) => {
    const cx = x + i * colunaW + colunaW / 2;
    const l = fonte.widthOfTextAtSize(letra, fonteDiaSemanaTam);
    pagina.drawText(letra, {
      x: cx - l / 2,
      y: gradeTopo - cabecalhoSemanaH + (cabecalhoSemanaH - fonteDiaSemanaTam) / 2 + 1 * e,
      size: fonteDiaSemanaTam,
      font: fonte,
      color: NAVY_TEXT,
    });
  });

  const fonteDiaTam = 6 * e;
  linhas.forEach((linha, li) => {
    const yLinha = gradeTopo - cabecalhoSemanaH - (li + 1) * linhaH;
    linha.forEach((dia, ci) => {
      if (dia === null) return;
      const cx = x + ci * colunaW + colunaW / 2;
      const destacado = eventosDoDia.has(dia);
      if (destacado) {
        const alturaPilula = Math.min(linhaH - 2 * e, colunaW - 4 * e);
        desenharPilula(pagina, {
          x: cx - alturaPilula / 2,
          yTopo: yLinha + linhaH / 2 + alturaPilula / 2,
          largura: alturaPilula,
          altura: alturaPilula,
          color: YELLOW,
        });
      }
      const texto = String(dia);
      const l = fonte.widthOfTextAtSize(texto, fonteDiaTam);
      pagina.drawText(texto, { x: cx - l / 2, y: yLinha + linhaH / 2 - fonteDiaTam * 0.35, size: fonteDiaTam, font: fonte, color: NAVY_TEXT });
    });
  });

  // Legenda — cada item com uma pílula amarela (dia/intervalo) + o título em
  // caixa alta, igual à referência (que quebra título comprido em 2 linhas
  // em vez de cortar). Pára de desenhar (resumindo o resto num "+N eventos")
  // quando o espaço reservado pro cartão acaba — nenhum cartão nunca invade
  // o espaço do vizinho, não importa quantos eventos o mês real tenha.
  const gruposTodos = agruparEventosDoMes(eventosDoMes).slice(0, MAX_LEGENDA_ITENS + 2);
  const fonteLegendaTam = 6.5 * e;
  const alturaLinha = (fonteLegendaTam + 2.5 * e) * 1;
  const yFimDisponivel = yTopo - cardH - LEGENDA_HEADROOM * e;
  let yLegenda = yTopo - cardH - 10 * e;
  let desenhados = 0;
  // Altura da pílula/"slot" de cada item e deslocamento do topo do slot (yLegenda)
  // até a linha de base do texto — usado tanto pro título de cada item quanto
  // pro "+N eventos", que precisa alinhar exatamente igual. Bug real (set/2026):
  // "+N eventos" usava `y: yLegenda` puro (o topo do próximo slot, não a linha
  // de base), ficando ~1 linha alto demais e sobrepondo o texto do item anterior.
  const chipAltura = 9 * e;
  const deslocamentoLinhaBase = -chipAltura + (chipAltura - fonteLegendaTam) / 2 + 1 * e;
  for (const g of gruposTodos) {
    const chipLargura = Math.max(14 * e, fonteBold.widthOfTextAtSize(g.rotulo, fonteLegendaTam) + 6 * e);
    const larguraTitulo = largura - chipLargura - 6 * e;
    const linhasTitulo = quebrarEm2Linhas(fonteBold, g.titulo.toUpperCase(), fonteLegendaTam, larguraTitulo);
    const alturaItem = Math.max(9 * e, linhasTitulo.length * alturaLinha);
    if (yLegenda - alturaItem < yFimDisponivel - 8 * e) break; // não cabe mais — vira "+N eventos"

    desenharPilula(pagina, { x, yTopo: yLegenda, largura: chipLargura, altura: chipAltura, color: YELLOW });
    const chipTextoLargura = fonteBold.widthOfTextAtSize(g.rotulo, fonteLegendaTam);
    pagina.drawText(g.rotulo, {
      x: x + (chipLargura - chipTextoLargura) / 2,
      y: yLegenda + deslocamentoLinhaBase,
      size: fonteLegendaTam,
      font: fonteBold,
      color: NAVY_TEXT,
    });
    // A pílula tem fundo próprio (texto navy fica legível nela), mas o
    // título ao lado fica direto sobre o fundo navy da página — bug real
    // (set/2026): estava com a mesma cor NAVY_TEXT, ou seja, texto navy em
    // cima de fundo navy, invisível. Aqui precisa ser branco.
    linhasTitulo.forEach((linha, li) => {
      pagina.drawText(linha, {
        x: x + chipLargura + 5 * e,
        y: yLegenda + deslocamentoLinhaBase - li * alturaLinha,
        size: fonteLegendaTam,
        font: fonteBold,
        color: WHITE,
      });
    });
    yLegenda -= alturaItem + 3 * e;
    desenhados++;
  }
  const restantes = gruposTodos.length - desenhados;
  if (restantes > 0) {
    pagina.drawText(`+${restantes} evento${restantes > 1 ? "s" : ""}`, {
      x,
      y: yLegenda + deslocamentoLinhaBase,
      size: fonteLegendaTam,
      font: fonte,
      color: rgb(0.75, 0.8, 0.92),
    });
  }
}

/** Layouts "bonitos" pra quantidades comuns de meses (1/3/6/12 são as opções
 * do modal de exportação) — cai num cálculo genérico (até 4 colunas) pra
 * qualquer outra quantidade. */
const LAYOUTS: Record<number, { cols: number; rows: number }> = {
  1: { cols: 1, rows: 1 },
  2: { cols: 2, rows: 1 },
  3: { cols: 3, rows: 1 },
  6: { cols: 3, rows: 2 },
  12: { cols: 4, rows: 3 },
};

function layoutPara(n: number): { cols: number; rows: number } {
  if (LAYOUTS[n]) return LAYOUTS[n];
  const cols = Math.min(4, n);
  return { cols, rows: Math.ceil(n / cols) };
}

/** Constrói o subtítulo do pôster a partir da lista de meses incluídos. */
function construirSubtitulo(meses: { ano: number; mes: number }[]): string {
  const primeiro = meses[0];
  const ultimo = meses[meses.length - 1];
  if (meses.length === 1) return `${MESES[primeiro.mes - 1]}/${primeiro.ano}`;
  if (meses.length === 12 && primeiro.mes === 1 && ultimo.mes === 12 && ultimo.ano === primeiro.ano) {
    return `(${primeiro.ano})`;
  }
  return `${MESES[primeiro.mes - 1]}/${primeiro.ano} a ${MESES[ultimo.mes - 1]}/${ultimo.ano}`;
}

function desenharPagina(
  pagina: PDFPage,
  {
    meses,
    eventosPorMes,
    fonte,
    fonteBold,
    logo,
    decoracaoCanto,
    decoracaoRodape,
    tituloPagina,
    numeroPagina,
    totalPaginas,
  }: {
    meses: { ano: number; mes: number }[];
    eventosPorMes: Map<string, { dia: number; titulo: string }[]>;
    fonte: PDFFont;
    fonteBold: PDFFont;
    logo: PDFImage | null;
    decoracaoCanto: PDFImage | null;
    decoracaoRodape: PDFImage | null;
    tituloPagina: string;
    numeroPagina: number;
    totalPaginas: number;
  }
) {
  pagina.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: NAVY });

  // Decoração do canto superior direito (arte real extraída do pôster do
  // Marketing) — sangrando pro canto, atrás do título.
  if (decoracaoCanto) {
    const larguraAlvo = 175;
    const alturaAlvo = (decoracaoCanto.height / decoracaoCanto.width) * larguraAlvo;
    pagina.drawImage(decoracaoCanto, { x: PAGE_W - larguraAlvo, y: PAGE_H - alturaAlvo, width: larguraAlvo, height: alturaAlvo });
  }

  // Título
  const titulo = "CALENDÁRIO";
  const tituloTam = 40;
  const tituloLargura = fonteBold.widthOfTextAtSize(titulo, tituloTam);
  pagina.drawText(titulo, { x: (PAGE_W - tituloLargura) / 2, y: PAGE_H - 62, size: tituloTam, font: fonteBold, color: YELLOW });
  const subtituloTam = 16;
  const subtituloLargura = fonteBold.widthOfTextAtSize(tituloPagina, subtituloTam);
  pagina.drawText(tituloPagina, { x: (PAGE_W - subtituloLargura) / 2, y: PAGE_H - 84, size: subtituloTam, font: fonteBold, color: WHITE });
  if (totalPaginas > 1) {
    const paginacao = `página ${numeroPagina}/${totalPaginas}`;
    const paginacaoTam = 8.5;
    const paginacaoLargura = fonte.widthOfTextAtSize(paginacao, paginacaoTam);
    pagina.drawText(paginacao, {
      x: (PAGE_W - paginacaoLargura) / 2,
      y: PAGE_H - 98,
      size: paginacaoTam,
      font: fonte,
      color: rgb(0.75, 0.8, 0.9),
    });
  }

  const MARGEM_LATERAL = 24;
  const gridTopoMax = PAGE_H - 150;
  const gridBaseMax = 92; // espaço reservado pro rodapé (logo + ilustração)
  const availW = PAGE_W - MARGEM_LATERAL * 2;
  const availH = gridTopoMax - gridBaseMax;

  const { cols, rows } = layoutPara(meses.length);
  const naiveW = cols * CARD_W + (cols - 1) * GAP;
  const naiveH = rows * (CARD_H + LEGENDA_HEADROOM) + (rows - 1) * GAP;
  const escala = Math.min(availW / naiveW, availH / naiveH, ESCALA_MAXIMA);

  const cardW = CARD_W * escala;
  const linhaAltura = (CARD_H + LEGENDA_HEADROOM) * escala;
  const gap = GAP * escala;
  const gridW = cols * cardW + (cols - 1) * gap;
  const gridH = rows * linhaAltura + (rows - 1) * gap;
  const inicioX = MARGEM_LATERAL + (availW - gridW) / 2;
  const inicioYTopo = gridTopoMax - (availH - gridH) / 2;

  meses.forEach(({ ano, mes }, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = inicioX + col * (cardW + gap);
    const yTopo = inicioYTopo - row * (linhaAltura + gap);
    const eventosDoMes = eventosPorMes.get(`${ano}-${mes}`) ?? [];
    const eventosDoDia = new Set(eventosDoMes.map((ev) => ev.dia));
    desenharMiniMes(pagina, { x, yTopo, largura: cardW, escala, mes, ano, fonte, fonteBold, eventosDoDia, eventosDoMes });
  });

  // Rodapé: ilustração (canto inferior esquerdo, sangrando) + logo (centralizada)
  if (decoracaoRodape) {
    const larguraAlvo = 150;
    const alturaAlvo = (decoracaoRodape.height / decoracaoRodape.width) * larguraAlvo;
    pagina.drawImage(decoracaoRodape, { x: -12, y: -14, width: larguraAlvo, height: alturaAlvo });
  }
  if (logo) {
    const larguraAlvo = 110;
    const alturaAlvo = (logo.height / logo.width) * larguraAlvo;
    pagina.drawImage(logo, { x: (PAGE_W - larguraAlvo) / 2, y: 24, width: larguraAlvo, height: alturaAlvo });
  }
}

export async function gerarCalendarioPdf({
  meses,
  eventosPorMes,
}: {
  meses: { ano: number; mes: number }[];
  eventosPorMes: Map<string, EventoCalendarioPdf[]>;
}): Promise<string> {
  const pdf = await PDFDocument.create();
  const primeiro = meses[0];
  pdf.setTitle(`Calendário — ${MESES[primeiro.mes - 1]} ${primeiro.ano} — Escola CDA`);
  pdf.setAuthor("Escola CDA");
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embarcarImagemPublica(pdf, "logo-cda.png");
  const decoracaoCanto = await embarcarImagemPublica(pdf, "calendario-decoracao-canto.png");
  const decoracaoRodape = await embarcarImagemPublica(pdf, "calendario-decoracao-rodape.png");

  // Agrupa eventos por dia dentro de cada mês (chave "ano-mes")
  const eventosPorMesDia = new Map<string, { dia: number; titulo: string }[]>();
  for (const [chave, eventos] of eventosPorMes) {
    eventosPorMesDia.set(
      chave,
      eventos.map((e) => ({ dia: e.data.getUTCDate(), titulo: e.titulo }))
    );
  }

  // Pôster comporta até 12 mini-meses numa página só — período maior (ex.:
  // "2 anos") vira várias páginas do mesmo design, 12 meses por vez.
  const MESES_POR_PAGINA = 12;
  const paginas: { ano: number; mes: number }[][] = [];
  for (let i = 0; i < meses.length; i += MESES_POR_PAGINA) {
    paginas.push(meses.slice(i, i + MESES_POR_PAGINA));
  }

  paginas.forEach((mesesDaPagina, indice) => {
    const pagina = pdf.addPage([PAGE_W, PAGE_H]);
    desenharPagina(pagina, {
      meses: mesesDaPagina,
      eventosPorMes: eventosPorMesDia,
      fonte,
      fonteBold,
      logo,
      decoracaoCanto,
      decoracaoRodape,
      tituloPagina: construirSubtitulo(mesesDaPagina),
      numeroPagina: indice + 1,
      totalPaginas: paginas.length,
    });
  });

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}
