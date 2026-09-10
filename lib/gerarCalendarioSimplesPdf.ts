import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont, type PDFImage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { truncar } from "@/lib/gerarRelatorioPdf";
import { MESES } from "@/lib/calendario";
import { desenharPilula, desenharRetanguloArredondado } from "@/lib/pdfFormas";
import { ANO_ANIVERSARIO_15, type EventoCalendarioPdf } from "@/lib/gerarCalendarioPdf";

/**
 * Segundo modelo de calendário em PDF — "folha única", pedido do dono depois
 * de conversar com a diretora (out/2026): o modelo "pôster" original
 * (lib/gerarCalendarioPdf.ts, navy cheio + cor por categoria + clique pra
 * detalhe) é o modelo PRA EQUIPE — mostra tudo, sem cortar nada. Esse aqui é
 * o modelo mais simples/enxuto (mural, comunicação com família): réplica
 * fiel de uma referência real feita no Canva pela própria escola
 * ("cda_calendario_2027_folha_única.pdf", enviada pelo dono) — fundo
 * branco, 12 mini-meses numa grade 4x3 numa página só, sem cor por
 * categoria (só um destaque amarelo pro dia com evento) e uma listinha
 * enxuta de eventos embaixo de cada mês (corta em "+N eventos" se não
 * couber — ao contrário do modelo da equipe, aqui é esperado não caber
 * tudo, por desenho).
 *
 * A decoração do canto superior direito (círculo navy + traços tracejados)
 * foi extraída da referência (pdftoppm em alta resolução + recorte) porque
 * é conteúdo vetorial complexo (não um raster isolado no PDF de origem) —
 * ver public/calendario-simples-decoracao-canto.png. Como o recorte tem só
 * branco ao redor da forma (nenhuma transparência real), dá pra desenhar
 * direto sobre o fundo branco da página sem o bug de canal alfa que já
 * mordeu esse projeto antes (ver comentário em gerarCalendarioPdf.ts).
 */

const PAGE_W = 595;
const PAGE_H = 842;

const NAVY_S = rgb(26 / 255, 41 / 255, 85 / 255); // #1A2955 — cor exata da referência (título, cabeçalho dos mini-meses, texto)
const AZUL_CARTAO = rgb(143 / 255, 219 / 255, 248 / 255); // #8FDBF8 — corpo do mini-mês
const AMARELO_S = rgb(252 / 255, 205 / 255, 10 / 255); // #FCCD0A — destaque de dia com evento + pílula do ano
const SOMBRA_TITULO = rgb(167 / 255, 212 / 255, 242 / 255); // #A7D4F2 — sombra clara atrás do título
const WHITE = rgb(1, 1, 1);
const CINZA_TEXTO = rgb(0.42, 0.46, 0.56);

const MARGEM_LATERAL = 24;
const COLS = 4;
const ROWS = 3;
const GAP_COL = 14;
const COL_W = (PAGE_W - 2 * MARGEM_LATERAL - (COLS - 1) * GAP_COL) / COLS;

const HEADER_H = 20;
const GAP_HEADER_BODY = 7;
const GRADE_LINHAS_FIXAS = 6; // mesma ideia do modelo da equipe: altura da grade é sempre igual, não importa se o mês tem 5 ou 6 semanas
const DIAS_SEMANA_H = 13;
const LINHA_DIA_H = 10.5;
const BODY_PAD_TOP = 6;
const BODY_PAD_BOTTOM = 5;
const BODY_H = BODY_PAD_TOP + DIAS_SEMANA_H + GRADE_LINHAS_FIXAS * LINHA_DIA_H + BODY_PAD_BOTTOM;
const CARD_TOTAL_H = HEADER_H + GAP_HEADER_BODY + BODY_H;
const CARD_RADIUS = 6;

async function embarcarImagemPublica(pdf: PDFDocument, arquivo: string): Promise<PDFImage | null> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", arquivo));
    return await pdf.embedPng(bytes);
  } catch (err) {
    console.error(`[gerarCalendarioSimplesPdf] Falha ao embutir "${arquivo}":`, err);
    return null;
  }
}

async function embarcarFonteTitulo(pdf: PDFDocument, fallback: PDFFont): Promise<PDFFont> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public/fonts", "Poppins-Bold.ttf"));
    return await pdf.embedFont(bytes, { subset: true });
  } catch (err) {
    console.error(`[gerarCalendarioSimplesPdf] Falha ao embutir a fonte do título:`, err);
    return fallback;
  }
}

function diasDoMes(ano: number, mes: number): (number | null)[][] {
  const primeiroDiaSemana = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay();
  const totalDias = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const celulas: (number | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let d = 1; d <= totalDias; d++) celulas.push(d);
  const linhas: (number | null)[][] = [];
  for (let i = 0; i < celulas.length; i += 7) linhas.push(celulas.slice(i, i + 7));
  return linhas;
}

/** Agrupa dias consecutivos com o MESMO título num intervalo só (ex.: recesso
 * de vários dias vira "21 A 30" em vez de repetir a frase). Mais simples que
 * a versão do modelo da equipe: não precisa considerar categoria, porque
 * aqui não existe cor por categoria — só um destaque amarelo. */
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
  return grupos.map((g) => {
    let rotulo = String(g.inicio);
    if (g.fim !== g.inicio) {
      rotulo = g.fim - g.inicio === 1 ? `${g.inicio}-${g.fim}` : `${g.inicio} A ${g.fim}`;
    }
    return { rotulo, titulo: g.titulo };
  });
}

/** Um mini-mês completo: cabeçalho navy (nome do mês) + corpo azul-claro
 * (dias da semana + grade) + listinha de eventos embaixo, cortando em
 * "+N eventos" se não couber no espaço reservado (ao contrário do modelo da
 * equipe, aqui é esperado não caber tudo — é o modelo "enxuto"). */
function desenharCardMes(
  pagina: PDFPage,
  {
    x,
    yTopo,
    mes,
    ano,
    fonte,
    fonteBold,
    diasComEvento,
    eventosDoMes,
    alturaListaDisponivel,
  }: {
    x: number;
    yTopo: number;
    mes: number;
    ano: number;
    fonte: PDFFont;
    fonteBold: PDFFont;
    diasComEvento: Set<number>;
    eventosDoMes: { dia: number; titulo: string }[];
    alturaListaDisponivel: number;
  }
) {
  // Cabeçalho navy — pílula com cantos totalmente arredondados, nome do mês
  // centrado em branco (igual à referência: cabeçalho e corpo são duas
  // formas SEPARADAS, com um respiro pequeno entre elas — não uma peça só).
  desenharRetanguloArredondado(pagina, { x, yTopo, largura: COL_W, altura: HEADER_H, raio: HEADER_H / 2, color: NAVY_S });
  const nomeMes = MESES[mes - 1].toUpperCase();
  const nomeTam = 9;
  const nomeLargura = fonteBold.widthOfTextAtSize(nomeMes, nomeTam);
  pagina.drawText(nomeMes, {
    x: x + (COL_W - nomeLargura) / 2,
    y: yTopo - HEADER_H / 2 - nomeTam * 0.35,
    size: nomeTam,
    font: fonteBold,
    color: WHITE,
  });

  // Corpo azul-claro — dias da semana + grade, sem cabeçalho próprio (o
  // nome do mês já está na pílula navy acima).
  const bodyTopo = yTopo - HEADER_H - GAP_HEADER_BODY;
  desenharRetanguloArredondado(pagina, { x, yTopo: bodyTopo, largura: COL_W, altura: BODY_H, raio: CARD_RADIUS, color: AZUL_CARTAO });

  const colunaW = COL_W / 7;
  const fonteDiaSemanaTam = 5.5;
  "DSTQQSS".split("").forEach((letra, i) => {
    const cx = x + i * colunaW + colunaW / 2;
    const l = fonte.widthOfTextAtSize(letra, fonteDiaSemanaTam);
    pagina.drawText(letra, {
      x: cx - l / 2,
      y: bodyTopo - BODY_PAD_TOP - DIAS_SEMANA_H / 2 - fonteDiaSemanaTam * 0.35,
      size: fonteDiaSemanaTam,
      font: fonteBold,
      color: NAVY_S,
    });
  });

  const linhas = diasDoMes(ano, mes);
  const gradeTopo = bodyTopo - BODY_PAD_TOP - DIAS_SEMANA_H;
  const gradeAltura = GRADE_LINHAS_FIXAS * LINHA_DIA_H;
  const linhaH = gradeAltura / linhas.length;
  const fonteDiaTam = 6.5;

  linhas.forEach((linha, li) => {
    const yLinha = gradeTopo - (li + 1) * linhaH;
    linha.forEach((dia, ci) => {
      if (dia === null) return;
      const cx = x + ci * colunaW + colunaW / 2;
      if (diasComEvento.has(dia)) {
        const raio = Math.min(colunaW, linhaH) * 0.32;
        pagina.drawEllipse({ x: cx, y: yLinha + linhaH / 2, xScale: raio, yScale: raio, color: AMARELO_S });
      }
      const texto = String(dia);
      const l = fonte.widthOfTextAtSize(texto, fonteDiaTam);
      pagina.drawText(texto, {
        x: cx - l / 2,
        y: yLinha + linhaH / 2 - fonteDiaTam * 0.35,
        size: fonteDiaTam,
        font: diasComEvento.has(dia) ? fonteBold : fonte,
        color: NAVY_S,
      });
    });
  });

  // Listinha de eventos — pequena pílula amarela com o dia/intervalo +
  // título em 1 linha só (trunca com reticências se não couber; ao contrário
  // do modelo da equipe, aqui é por desenho que nem tudo cabe). Corta em
  // "+N eventos" quando o espaço reservado acaba.
  const grupos = agruparEventosDoMes(eventosDoMes);
  const fonteListaTam = 7;
  const alturaLinha = 12.5;
  const chipAltura = 9.5;
  let yLista = bodyTopo - BODY_H - 10;
  const yFimDisponivel = yTopo - CARD_TOTAL_H - alturaListaDisponivel;
  let desenhados = 0;
  for (const g of grupos) {
    const ehUltimo = desenhados === grupos.length - 1;
    const margemNecessaria = ehUltimo ? 0 : alturaLinha; // reserva espaço pro "+N eventos" antes de aceitar mais um item, se sobrar resto
    if (yLista - alturaLinha < yFimDisponivel + margemNecessaria) break;

    const chipLargura = Math.max(14, fonteBold.widthOfTextAtSize(g.rotulo, fonteListaTam) + 6);
    desenharPilula(pagina, { x, yTopo: yLista, largura: chipLargura, altura: chipAltura, color: AMARELO_S });
    const chipTextoLargura = fonteBold.widthOfTextAtSize(g.rotulo, fonteListaTam);
    pagina.drawText(g.rotulo, {
      x: x + (chipLargura - chipTextoLargura) / 2,
      y: yLista - chipAltura + (chipAltura - fonteListaTam) / 2 + 1,
      size: fonteListaTam,
      font: fonteBold,
      color: NAVY_S,
    });
    const tituloTexto = truncar(fonteBold, g.titulo.toUpperCase(), fonteListaTam, COL_W - chipLargura - 6);
    pagina.drawText(tituloTexto, {
      x: x + chipLargura + 6,
      y: yLista - chipAltura + (chipAltura - fonteListaTam) / 2 + 1,
      size: fonteListaTam,
      font: fonteBold,
      color: NAVY_S,
    });
    yLista -= alturaLinha;
    desenhados++;
  }
  const restantes = grupos.length - desenhados;
  if (restantes > 0) {
    pagina.drawText(`+${restantes} evento${restantes > 1 ? "s" : ""}`, {
      x,
      y: yLista - chipAltura + (chipAltura - fonteListaTam) / 2 + 1,
      size: fonteListaTam,
      font: fonte,
      color: CINZA_TEXTO,
    });
  }
}

export async function gerarCalendarioSimplesPdf({
  ano,
  eventosPorMes,
}: {
  ano: number;
  eventosPorMes: Map<string, EventoCalendarioPdf[]>;
}): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`Calendário ${ano} — Escola CDA`);
  pdf.setAuthor("Escola CDA");

  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fonteTitulo = await embarcarFonteTitulo(pdf, fonteBold);
  const decoracaoCanto = await embarcarImagemPublica(pdf, "calendario-simples-decoracao-canto.png");
  const decoracaoRodape = await embarcarImagemPublica(pdf, "calendario-decoracao-rodape.png");
  const logo = await embarcarImagemPublica(pdf, ano === ANO_ANIVERSARIO_15 ? "logo-cda.png" : "logo-cda-sem-selo.png");

  const pagina = pdf.addPage([PAGE_W, PAGE_H]);
  pagina.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: WHITE });

  if (decoracaoCanto) {
    // Recorte extraído da referência real (ver comentário no topo do
    // arquivo) — só tem branco ao redor da forma, então desenha direto sem
    // canal alfa, encostado no canto superior direito da página.
    const larguraAlvo = 111.4;
    const alturaAlvo = (decoracaoCanto.height / decoracaoCanto.width) * larguraAlvo;
    pagina.drawImage(decoracaoCanto, { x: PAGE_W - larguraAlvo, y: PAGE_H - alturaAlvo, width: larguraAlvo, height: alturaAlvo });
  }

  // Título — mesma fonte (Poppins Bold) do modelo da equipe, com uma cópia
  // clara desenhada por baixo, levemente deslocada, pro efeito de sombra
  // suave da referência.
  const titulo = "CALENDÁRIO";
  const tituloTam = 40;
  const tituloLargura = fonteTitulo.widthOfTextAtSize(titulo, tituloTam);
  const tituloX = (PAGE_W - tituloLargura) / 2;
  const tituloY = PAGE_H - 72;
  pagina.drawText(titulo, { x: tituloX + 3, y: tituloY - 3, size: tituloTam, font: fonteTitulo, color: SOMBRA_TITULO });
  pagina.drawText(titulo, { x: tituloX, y: tituloY, size: tituloTam, font: fonteTitulo, color: NAVY_S });

  // Pílula do ano
  const anoTexto = String(ano);
  const anoTam = 16;
  const anoLargura = fonteTitulo.widthOfTextAtSize(anoTexto, anoTam);
  const pilulaLargura = anoLargura + 36;
  const pilulaAltura = 28;
  const pilulaX = (PAGE_W - pilulaLargura) / 2;
  const pilulaYTopo = tituloY - 22;
  desenharPilula(pagina, { x: pilulaX, yTopo: pilulaYTopo, largura: pilulaLargura, altura: pilulaAltura, color: AMARELO_S });
  pagina.drawText(anoTexto, {
    x: pilulaX + (pilulaLargura - anoLargura) / 2,
    y: pilulaYTopo - pilulaAltura + (pilulaAltura - anoTam) / 2 + 2,
    size: anoTam,
    font: fonteTitulo,
    color: NAVY_S,
  });

  // Rodapé: ilustração (canto inferior esquerdo, sangrando) + logo (centralizada)
  const RODAPE_H = 70;
  if (decoracaoRodape) {
    const larguraAlvo = 95;
    const alturaAlvo = (decoracaoRodape.height / decoracaoRodape.width) * larguraAlvo;
    pagina.drawImage(decoracaoRodape, { x: -8, y: -10, width: larguraAlvo, height: alturaAlvo });
  }
  if (logo) {
    const larguraAlvo = 100;
    const alturaAlvo = (logo.height / logo.width) * larguraAlvo;
    pagina.drawImage(logo, { x: (PAGE_W - larguraAlvo) / 2, y: 14, width: larguraAlvo, height: alturaAlvo });
  }

  // Grade de 12 mini-meses, 4 colunas x 3 linhas.
  const gridTopo = pilulaYTopo - pilulaAltura - 26;
  const gridBase = RODAPE_H;
  const rowPitch = (gridTopo - gridBase) / ROWS;
  const alturaListaDisponivel = rowPitch - CARD_TOTAL_H - 10;

  for (let mes = 1; mes <= 12; mes++) {
    const idx = mes - 1;
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const x = MARGEM_LATERAL + col * (COL_W + GAP_COL);
    const yTopo = gridTopo - row * rowPitch;

    const eventosDoMes = (eventosPorMes.get(`${ano}-${mes}`) ?? []).map((e) => ({ dia: e.data.getUTCDate(), titulo: e.titulo }));
    const diasComEvento = new Set(eventosDoMes.map((e) => e.dia));

    desenharCardMes(pagina, { x, yTopo, mes, ano, fonte, fonteBold, diasComEvento, eventosDoMes, alturaListaDisponivel });
  }

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}
