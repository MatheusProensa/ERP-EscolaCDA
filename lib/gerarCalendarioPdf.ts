import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { embarcarLogo, truncar } from "@/lib/gerarRelatorioPdf";
import { MESES } from "@/lib/calendario";

/**
 * Design único de calendário em PDF (pedido do dono, set/2026, replicando um
 * pôster que o Marketing estava desenhando à mão no Canva): pôster de 1
 * página, mini-meses em grade, fundo navy + destaques amarelos. Antes existia
 * um formato "detalhado" (1 página por mês, com categoria colorida por
 * evento) e esse pôster só pra "ano inteiro" — o dono pediu pra esse design
 * valer pra QUALQUER período exportado (1/3/6/12 meses), não só o ano
 * completo, então esse arquivo virou o único gerador de PDF do calendário.
 * Não mostra categoria por cor (só destaca o dia em amarelo + legenda embaixo
 * de cada mês) — é pensado pra imprimir/pendurar, não pra consulta detalhada.
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

// Tamanho "base" de um mini-mês (escala 1×) — os mesmos números usados
// quando a grade é 4×3 (ano completo), que é o caso mais apertado. Pra
// períodos menores (1, 3 ou 6 meses) a grade escala pra cima e ocupa melhor
// a página, mantendo as mesmas proporções — é o MESMO design, só maior.
const CARD_W = 127;
const CARD_H = 209;
const GAP = 10;
const ESCALA_MAXIMA = 2.2; // trava pra "1 mês" não virar um cartão gigante desproporcional

export type EventoCalendarioPdf = { titulo: string; data: Date };

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

function desenharMiniMes(
  pagina: PDFPage,
  {
    x,
    yTopo,
    largura,
    altura,
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
    altura: number;
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
  const CABECALHO_H = 18 * e;
  // Cabeçalho azul com o nome do mês
  pagina.drawRectangle({ x, y: yTopo - CABECALHO_H, width: largura, height: CABECALHO_H, color: HEADER_BLUE });
  const nomeMes = MESES[mes - 1].toUpperCase();
  const nomeTam = 9 * e;
  const nomeLargura = fonteBold.widthOfTextAtSize(nomeMes, nomeTam);
  pagina.drawText(nomeMes, {
    x: x + (largura - nomeLargura) / 2,
    y: yTopo - CABECALHO_H + 5.5 * e,
    size: nomeTam,
    font: fonteBold,
    color: WHITE,
  });

  // Grade de dias (fundo branco)
  const linhas = diasDoMes(ano, mes);
  const colunaW = largura / 7;
  const cabecalhoSemanaH = 10 * e;
  const linhaH = 10.5 * e;
  const gradeAltura = cabecalhoSemanaH + linhas.length * linhaH;
  const gradeTopo = yTopo - CABECALHO_H;
  pagina.drawRectangle({ x, y: gradeTopo - gradeAltura, width: largura, height: gradeAltura, color: WHITE });

  const fonteDiaSemanaTam = 6 * e;
  "DSTQQSS".split("").forEach((letra, i) => {
    const cx = x + i * colunaW + colunaW / 2;
    const l = fonte.widthOfTextAtSize(letra, fonteDiaSemanaTam);
    pagina.drawText(letra, {
      x: cx - l / 2,
      y: gradeTopo - cabecalhoSemanaH + 2.5 * e,
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
        pagina.drawRectangle({ x: cx - colunaW / 2 + 1 * e, y: yLinha + 1 * e, width: colunaW - 2 * e, height: linhaH - 2 * e, color: YELLOW });
      }
      const texto = String(dia);
      const l = fonte.widthOfTextAtSize(texto, fonteDiaTam);
      pagina.drawText(texto, { x: cx - l / 2, y: yLinha + 3 * e, size: fonteDiaTam, font: fonte, color: NAVY_TEXT });
    });
  });

  // Legenda — cada item com um "chip" amarelo (dia/intervalo) + o título
  const grupos = agruparEventosDoMes(eventosDoMes);
  const fonteLegendaTam = 6 * e;
  let yLegenda = gradeTopo - gradeAltura - 10 * e;
  const yFimDisponivel = yTopo - altura;
  for (const g of grupos) {
    if (yLegenda < yFimDisponivel) break; // não deixa a legenda invadir o card vizinho
    const chipLargura = Math.max(12 * e, fonteBold.widthOfTextAtSize(g.rotulo, fonteLegendaTam) + 4 * e);
    pagina.drawRectangle({ x, y: yLegenda - 6 * e, width: chipLargura, height: 8 * e, color: YELLOW });
    const chipTextoLargura = fonteBold.widthOfTextAtSize(g.rotulo, fonteLegendaTam);
    pagina.drawText(g.rotulo, {
      x: x + (chipLargura - chipTextoLargura) / 2,
      y: yLegenda - 4 * e,
      size: fonteLegendaTam,
      font: fonteBold,
      color: NAVY_TEXT,
    });
    pagina.drawText(truncar(fonte, g.titulo, fonteLegendaTam, largura - chipLargura - 6 * e), {
      x: x + chipLargura + 4 * e,
      y: yLegenda - 4 * e,
      size: fonteLegendaTam,
      font: fonte,
      color: NAVY_TEXT,
    });
    yLegenda -= 9 * e;
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
    tituloPagina,
    numeroPagina,
    totalPaginas,
  }: {
    meses: { ano: number; mes: number }[];
    eventosPorMes: Map<string, { dia: number; titulo: string }[]>;
    fonte: PDFFont;
    fonteBold: PDFFont;
    logo: Awaited<ReturnType<typeof embarcarLogo>>;
    tituloPagina: string;
    numeroPagina: number;
    totalPaginas: number;
  }
) {
  pagina.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: NAVY });

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
  const gridTopoMax = PAGE_H - 110;
  const gridBaseMax = 74; // espaço reservado pro logo no rodapé
  const availW = PAGE_W - MARGEM_LATERAL * 2;
  const availH = gridTopoMax - gridBaseMax;

  const { cols, rows } = layoutPara(meses.length);
  const naiveW = cols * CARD_W + (cols - 1) * GAP;
  const naiveH = rows * CARD_H + (rows - 1) * GAP;
  const escala = Math.min(availW / naiveW, availH / naiveH, ESCALA_MAXIMA);

  const cardW = CARD_W * escala;
  const cardH = CARD_H * escala;
  const gap = GAP * escala;
  const gridW = cols * cardW + (cols - 1) * gap;
  const gridH = rows * cardH + (rows - 1) * gap;
  const inicioX = MARGEM_LATERAL + (availW - gridW) / 2;
  const inicioYTopo = gridTopoMax - (availH - gridH) / 2;

  meses.forEach(({ ano, mes }, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = inicioX + col * (cardW + gap);
    const yTopo = inicioYTopo - row * (cardH + gap);
    const eventosDoMes = eventosPorMes.get(`${ano}-${mes}`) ?? [];
    const eventosDoDia = new Set(eventosDoMes.map((ev) => ev.dia));
    desenharMiniMes(pagina, {
      x,
      yTopo,
      largura: cardW,
      altura: cardH,
      escala,
      mes,
      ano,
      fonte,
      fonteBold,
      eventosDoDia,
      eventosDoMes,
    });
  });

  // Logo no rodapé, centralizado
  if (logo) {
    const larguraAlvo = 90;
    const alturaAlvo = (logo.height / logo.width) * larguraAlvo;
    pagina.drawImage(logo, { x: (PAGE_W - larguraAlvo) / 2, y: 20, width: larguraAlvo, height: alturaAlvo });
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
  const logo = await embarcarLogo(pdf);

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
      tituloPagina: construirSubtitulo(mesesDaPagina),
      numeroPagina: indice + 1,
      totalPaginas: paginas.length,
    });
  });

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}
