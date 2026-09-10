import { PDFDocument, StandardFonts, rgb, PDFName, type PDFPage, type PDFFont, type PDFImage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { truncar } from "@/lib/gerarRelatorioPdf";
import { MESES, CATEGORIAS_EVENTO, corCategoriaHex } from "@/lib/calendario";

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
 * não ter dois formatos de calendário no sistema.
 *
 * Cor por categoria (set/2026): o destaque do dia na grade e a pílula da
 * legenda usam a cor da CATEGORIA do evento (COR_CATEGORIA_HEX, a mesma
 * paleta da tela /calendario) em vez de amarelo fixo pra todo mundo — com
 * muito evento por mês (pedido real do dono), cor por categoria é o que
 * deixa o pôster escaneável à distância em vez de virar uma parede de texto
 * amarelo. Um dia com mais de um evento de categorias diferentes usa a cor
 * da categoria que vem primeiro em ordem alfabética (ver corDoDia) — é uma
 * simplificação deliberada: é pôster de parede pra visão geral, não relatório
 * detalhado, e o caso de dois eventos de categorias diferentes no mesmo dia é
 * raro. Uma legenda de categorias (cor + nome) fica no rodapé da página.
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
const MAX_LEGENDA_ITENS = 8; // acima disso, agrupa o resto num "+N eventos"
const LEGENDA_HEADROOM = 8 + MAX_LEGENDA_ITENS * 9; // piso mínimo de espaço pra legenda — desenharPagina
// normalmente passa um valor MAIOR que esse (ver legendaHeadroom em desenharPagina): esse aqui só
// entra em jogo como fallback pra layouts hipotéticos fora de 1/3/6/12 meses onde sobra pouca altura.
const GAP = 14;
const ESCALA_MAXIMA = 2.4; // trava pra "1 mês" não virar um cartão gigante desproporcional

export type EventoCalendarioPdf = { titulo: string; data: Date; categoria: string };

/** Converte hex ("#f5a524") pro formato 0-1 que rgb() do pdf-lib espera. */
function hexParaRgb(hex: string): ReturnType<typeof rgb> {
  const limpo = hex.replace("#", "");
  const r = parseInt(limpo.substring(0, 2), 16) / 255;
  const g = parseInt(limpo.substring(2, 4), 16) / 255;
  const b = parseInt(limpo.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
}

/** Escolhe branco ou o navy do pôster pro texto em cima de uma cor sólida de
 * categoria — algumas são claras (laranja), outras escuras (roxo, magenta),
 * então não dá pra cravar uma cor de texto só (luminância relativa, fórmula
 * padrão de contraste percebido). */
function corTextoContraste(hex: string): ReturnType<typeof rgb> {
  const limpo = hex.replace("#", "");
  const r = parseInt(limpo.substring(0, 2), 16);
  const g = parseInt(limpo.substring(2, 4), 16);
  const b = parseInt(limpo.substring(4, 6), 16);
  const luminancia = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminancia > 150 ? NAVY_TEXT : WHITE;
}

async function embarcarImagemPublica(pdf: PDFDocument, arquivo: string): Promise<PDFImage | null> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", arquivo));
    return await pdf.embedPng(bytes);
  } catch (err) {
    // Bug real (set/2026): falha aqui virava fallback silencioso (fundo navy
    // sólido em vez do gradiente, por exemplo) sem deixar rastro nenhum nos
    // logs — quem via o PDF não tinha como saber SE uma imagem faltou ou se
    // era assim mesmo. Loga pra dar pra investigar pelos logs da Vercel.
    console.error(`[gerarCalendarioPdf] Falha ao embutir "${arquivo}":`, err);
    return null;
  }
}

/**
 * Fonte do título "CALENDÁRIO" na referência não é Helvetica — é a Poppins
 * Bold do Canva (confirmado comparando letra a letra com o pôster original,
 * set/2026: "R" com perna reta, "Á" com o acento em bloco, "O"/"D" bem
 * circulares). Só o título/subtítulo usam essa fonte; o resto do pôster
 * (cabeçalho dos mini-meses, números dos dias) já bate com Helvetica, então
 * não mexe no resto pra não trocar um descompasso por outro.
 * Cai pra Helvetica Bold (fonteBold) se o arquivo faltar — título feio é
 * melhor que PDF quebrado.
 */
async function embarcarFonteTitulo(pdf: PDFDocument, fallback: PDFFont): Promise<PDFFont> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public/fonts", "Poppins-Bold.ttf"));
    return await pdf.embedFont(bytes, { subset: true });
  } catch (err) {
    console.error(`[gerarCalendarioPdf] Falha ao embutir a fonte do título:`, err);
    return fallback;
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

/** Agrupa dias consecutivos com o MESMO título E categoria num intervalo só,
 * pra legenda não repetir a mesma frase várias vezes (ex.: recesso de vários
 * dias, hoje gravado como um EventoCalendario por dia). Rótulo do intervalo
 * segue a referência: 2 dias usa hífen ("11-12"), 3 ou mais usa "A" por
 * extenso ("21 A 30") — confirmado nos dois casos reais do pôster original.
 * Exige a mesma categoria pra juntar (não só o mesmo título) porque agora a
 * pílula do item é colorida pela categoria — juntar dias de categorias
 * diferentes teria que escolher uma cor só e mentir sobre a outra. */
function agruparEventosDoMes(
  eventos: { dia: number; titulo: string; categoria: string }[]
): { rotulo: string; titulo: string; categoria: string }[] {
  const ordenados = [...eventos].sort((a, b) => a.dia - b.dia || a.titulo.localeCompare(b.titulo, "pt-BR"));
  const grupos: { inicio: number; fim: number; titulo: string; categoria: string }[] = [];
  for (const e of ordenados) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.titulo === e.titulo && ultimo.categoria === e.categoria && e.dia === ultimo.fim + 1) {
      ultimo.fim = e.dia;
    } else {
      grupos.push({ inicio: e.dia, fim: e.dia, titulo: e.titulo, categoria: e.categoria });
    }
  }
  return grupos.map((g) => {
    let rotulo = String(g.inicio);
    if (g.fim !== g.inicio) {
      rotulo = g.fim - g.inicio === 1 ? `${g.inicio}-${g.fim}` : `${g.inicio} A ${g.fim}`;
    }
    return { rotulo, titulo: g.titulo, categoria: g.categoria };
  });
}

/** Cor de cada dia do mês que tem evento, pro destaque na grade — um dia
 * às vezes tem mais de um evento (possivelmente de categorias diferentes);
 * usa a categoria alfabeticamente primeira pra decidir a cor desse dia (ver
 * comentário no topo do arquivo sobre essa simplificação ser deliberada). */
function corPorDiaDoMes(eventos: { dia: number; categoria: string }[]): Map<number, string> {
  const porDia = new Map<number, string>();
  const ordenados = [...eventos].sort((a, b) => a.categoria.localeCompare(b.categoria, "pt-BR"));
  for (const e of ordenados) {
    if (!porDia.has(e.dia)) porDia.set(e.dia, e.categoria);
  }
  const cores = new Map<number, string>();
  for (const [dia, categoria] of porDia) cores.set(dia, corCategoriaHex(categoria).dot);
  return cores;
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

/**
 * Link interno de PDF (clicar num mini-mês do pôster e ir pra página de
 * detalhe daquele mês) — pdf-lib não tem um `addLink` de alto nível, só a
 * API de baixo nível de anotações (`Annots` na página + um dicionário de
 * anotação `Link` com uma ação `Dest` apontando pra `PDFRef` da página de
 * destino), então monta isso na mão. Padrão documentado em vários exemplos
 * da comunidade pdf-lib pra link interno entre páginas do mesmo documento.
 */
function adicionarLinkInterno(
  pdf: PDFDocument,
  pagina: PDFPage,
  rect: { x: number; y: number; largura: number; altura: number },
  paginaDestino: PDFPage
) {
  const anotacao = pdf.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: [rect.x, rect.y, rect.x + rect.largura, rect.y + rect.altura],
    Border: [0, 0, 0],
    Dest: [paginaDestino.ref, "Fit"],
  });
  const anotacaoRef = pdf.context.register(anotacao);
  const anotsExistentes = pagina.node.Annots();
  if (anotsExistentes) {
    anotsExistentes.push(anotacaoRef);
  } else {
    pagina.node.set(PDFName.of("Annots"), pdf.context.obj([anotacaoRef]));
  }
}

/** Só a grade do mini-mês (cartão + cabeçalho + dias + destaque por
 * categoria) — sem a legenda de eventos embaixo, que cada modo de página usa
 * de um jeito diferente (overview trunca em "+N eventos"; página de detalhe
 * de 1 mês mostra tudo, em colunas — ver desenharLegendaCompleta). */
function desenharGradeMes(
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
    corPorDia,
  }: {
    x: number;
    yTopo: number;
    largura: number;
    escala: number;
    mes: number;
    ano: number;
    fonte: PDFFont;
    fonteBold: PDFFont;
    corPorDia: Map<number, string>;
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

  // Destaque dos dias com evento — UMA barra arredondada por sequência de
  // dias seguidos NA MESMA COR na mesma linha da grade (não um círculo por
  // dia). Réplica fiel da referência: "11-12" ou "21-30" viram uma barra
  // contínua (cantos arredondados só nas pontas de fora, reta entre os dias
  // do meio — é um retângulo arredondado só, não vários círculos emendados),
  // e um dia avulso vira um quadrado arredondado do tamanho da própria
  // célula. A cor agora vem da categoria (corPorDia) — a barra só emenda
  // dias consecutivos que têm a MESMA cor; muda a categoria, quebra a barra.
  const margemH = colunaW * 0.1;
  const margemV = linhaH * 0.14;
  const raioDestaque = Math.min(colunaW, linhaH) * 0.22;
  linhas.forEach((linha, li) => {
    const yLinha = gradeTopo - cabecalhoSemanaH - (li + 1) * linhaH;
    let ci = 0;
    while (ci < linha.length) {
      const dia = linha[ci];
      const cor = dia === null ? undefined : corPorDia.get(dia);
      if (dia === null || !cor) {
        ci++;
        continue;
      }
      let fimRun = ci;
      while (fimRun + 1 < linha.length) {
        const proximo = linha[fimRun + 1];
        if (proximo === null || corPorDia.get(proximo) !== cor) break;
        fimRun++;
      }
      const xIni = x + ci * colunaW + margemH;
      const xFim = x + (fimRun + 1) * colunaW - margemH;
      desenharRetanguloArredondado(pagina, {
        x: xIni,
        yTopo: yLinha + linhaH - margemV,
        largura: xFim - xIni,
        altura: linhaH - 2 * margemV,
        raio: raioDestaque,
        color: hexParaRgb(cor),
      });
      ci = fimRun + 1;
    }
  });

  const fonteDiaTam = 6 * e;
  linhas.forEach((linha, li) => {
    const yLinha = gradeTopo - cabecalhoSemanaH - (li + 1) * linhaH;
    linha.forEach((dia, ci) => {
      if (dia === null) return;
      const cx = x + ci * colunaW + colunaW / 2;
      const texto = String(dia);
      const l = fonte.widthOfTextAtSize(texto, fonteDiaTam);
      // Algumas cores de categoria são escuras (roxo, magenta) — texto navy
      // fixo ficaria ilegível em cima delas, por isso usa a mesma escolha de
      // contraste da pílula da legenda pros dias destacados.
      const cor = corPorDia.get(dia);
      const corTexto = cor ? corTextoContraste(cor) : NAVY_TEXT;
      pagina.drawText(texto, { x: cx - l / 2, y: yLinha + linhaH / 2 - fonteDiaTam * 0.35, size: fonteDiaTam, font: fonte, color: corTexto });
    });
  });
}

/** Mini-mês completo (grade + legenda TRUNCADA) — usado só na visão geral
 * (vários meses na mesma página): a legenda resume o resto em "+N eventos"
 * quando o espaço do cartão acaba, porque cada cartão tem altura fixa e
 * nenhum pode invadir o vizinho. A página de detalhe de 1 mês (que existe
 * justamente pra mostrar tudo) usa desenharGradeMes + desenharLegendaCompleta
 * direto, não esta função. */
function desenharMiniMes(
  pagina: PDFPage,
  {
    x,
    yTopo,
    largura,
    escala,
    legendaHeadroom,
    mes,
    ano,
    fonte,
    fonteBold,
    corPorDia,
    eventosDoMes,
  }: {
    x: number;
    yTopo: number;
    largura: number;
    escala: number;
    legendaHeadroom: number;
    mes: number;
    ano: number;
    fonte: PDFFont;
    fonteBold: PDFFont;
    corPorDia: Map<number, string>;
    eventosDoMes: { dia: number; titulo: string; categoria: string }[];
  }
) {
  const e = escala;
  const cardH = CARD_H * e;
  desenharGradeMes(pagina, { x, yTopo, largura, escala, mes, ano, fonte, fonteBold, corPorDia });

  // Legenda — cada item com uma pílula colorida pela CATEGORIA do evento
  // (dia/intervalo) + o título em caixa alta, igual à referência (que quebra
  // título comprido em 2 linhas em vez de cortar). Pára de desenhar (resumindo
  // o resto num "+N eventos")
  // quando o espaço reservado pro cartão acaba — nenhum cartão nunca invade
  // o espaço do vizinho, não importa quantos eventos o mês real tenha.
  const gruposTodos = agruparEventosDoMes(eventosDoMes).slice(0, MAX_LEGENDA_ITENS + 2);
  const fonteLegendaTam = 6.5 * e;
  const alturaLinha = (fonteLegendaTam + 2.5 * e) * 1;
  const yFimDisponivel = yTopo - cardH - legendaHeadroom;
  let yLegenda = yTopo - cardH - 10 * e;
  let desenhados = 0;
  // Altura da pílula/"slot" de cada item e deslocamento do topo do slot (yLegenda)
  // até a linha de base do texto — usado tanto pro título de cada item quanto
  // pro "+N eventos", que precisa alinhar exatamente igual. Bug real (set/2026):
  // "+N eventos" usava `y: yLegenda` puro (o topo do próximo slot, não a linha
  // de base), ficando ~1 linha alto demais e sobrepondo o texto do item anterior.
  const chipAltura = 9 * e;
  const deslocamentoLinhaBase = -chipAltura + (chipAltura - fonteLegendaTam) / 2 + 1 * e;
  // Bug real (set/2026, achado testando com dados reais): o corte "cabe mais um
  // item?" não reservava espaço pra linha "+N eventos" que vem DEPOIS do loop —
  // o último item entrava mesmo deixando só uma sobra menor que uma linha de
  // texto, e o "+N eventos" acabava desenhado já dentro da faixa de espaçamento
  // até o próximo cartão, sobrepondo o cabeçalho azul do mês seguinte. Reserva
  // a altura de uma linha (mesmo orçamento de um item de 1 linha) pro resumo
  // ANTES de aceitar mais um item — se não sobrar isso, já vira "+N eventos".
  const alturaResumoReservada = alturaLinha;
  for (const g of gruposTodos) {
    const chipLargura = Math.max(14 * e, fonteBold.widthOfTextAtSize(g.rotulo, fonteLegendaTam) + 6 * e);
    const larguraTitulo = largura - chipLargura - 6 * e;
    const linhasTitulo = quebrarEm2Linhas(fonteBold, g.titulo.toUpperCase(), fonteLegendaTam, larguraTitulo);
    const alturaItem = Math.max(9 * e, linhasTitulo.length * alturaLinha);
    const ehUltimoGrupo = desenhados === gruposTodos.length - 1;
    const margemNecessaria = ehUltimoGrupo ? 0 : alturaResumoReservada; // último item não precisa deixar espaço pro resumo, porque não vai sobrar resto nenhum
    if (yLegenda - alturaItem < yFimDisponivel + margemNecessaria) break; // não cabe mais (+ resumo, se houver resto) — vira "+N eventos"

    const corCategoria = corCategoriaHex(g.categoria).dot;
    desenharPilula(pagina, { x, yTopo: yLegenda, largura: chipLargura, altura: chipAltura, color: hexParaRgb(corCategoria) });
    const chipTextoLargura = fonteBold.widthOfTextAtSize(g.rotulo, fonteLegendaTam);
    pagina.drawText(g.rotulo, {
      x: x + (chipLargura - chipTextoLargura) / 2,
      y: yLegenda + deslocamentoLinhaBase,
      size: fonteLegendaTam,
      font: fonteBold,
      color: corTextoContraste(corCategoria),
    });
    // A pílula tem fundo próprio (texto navy fica legível nela), mas o
    // título ao lado fica direto sobre o fundo navy da página — bug real
    // (set/2026): estava com a mesma cor NAVY_TEXT, ou seja, texto navy em
    // cima de fundo navy, invisível. Aqui precisa ser branco.
    linhasTitulo.forEach((linha, li) => {
      pagina.drawText(linha, {
        x: x + chipLargura + 6 * e,
        y: yLegenda + deslocamentoLinhaBase - li * alturaLinha,
        size: fonteLegendaTam,
        font: fonteBold,
        color: WHITE,
      });
    });
    yLegenda -= alturaItem + 4 * e;
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

/** Legenda de eventos SEM corte — usada na página de detalhe de 1 mês
 * (clicar num mês na visão geral abre essa página). Flui em colunas (tipo
 * jornal) em vez de uma coluna só: com mês de conteúdo real cheio (achado
 * revisando com dados reais: setembro/2026 tem 50 eventos agrupados), uma
 * coluna só nunca ia caber por mais que a "arte" encolhesse — múltiplas
 * colunas multiplicam a capacidade sem precisar de fonte minúscula. Escolhe
 * o menor número de colunas (1 a 4) que cabe tudo sem cortar; se nem 4
 * colunas bastar (caso extremo), ainda desenha tudo mesmo assim — essa
 * página existe justamente pra nunca esconder evento nenhum em "+N eventos".
 */
function desenharLegendaCompleta(
  pagina: PDFPage,
  {
    x,
    yTopo,
    largura,
    altura,
    fonte,
    fonteBold,
    eventosDoMes,
  }: {
    x: number;
    yTopo: number;
    largura: number;
    altura: number;
    fonte: PDFFont;
    fonteBold: PDFFont;
    eventosDoMes: { dia: number; titulo: string; categoria: string }[];
  }
) {
  const grupos = agruparEventosDoMes(eventosDoMes);
  if (grupos.length === 0) {
    pagina.drawText("Nenhum evento cadastrado neste mês.", { x, y: yTopo - 12, size: 9, font: fonte, color: rgb(0.75, 0.8, 0.92) });
    return;
  }

  const fonteTam = 7.5;
  const alturaLinha = fonteTam + 3.5;
  const chipAltura = 10.5;
  const deslocamentoLinhaBase = -chipAltura + (chipAltura - fonteTam) / 2 + 1;
  const gapItem = 4;
  const gapColuna = 14;

  const alturasParaLargura = (largColuna: number) =>
    grupos.map((g) => {
      const chipLargura = Math.max(16, fonteBold.widthOfTextAtSize(g.rotulo, fonteTam) + 7);
      const linhasTitulo = quebrarEm2Linhas(fonteBold, g.titulo.toUpperCase(), fonteTam, largColuna - chipLargura - 7);
      return Math.max(chipAltura, linhasTitulo.length * alturaLinha);
    });

  // Quantas colunas usar — dois bugs reais encontrados revisando com o
  // calendário completo, corrigidos juntos aqui:
  // 1) Uma coluna só com MUITOS eventos (ex.: 34 em março) virava parede de
  //    texto alinhada à esquerda com metade da página vazia ("tá muito
  //    amador"). Corrigido com um piso de colunas baseado na QUANTIDADE de
  //    eventos (mês leve continua em 1 coluna só, como no exemplo que o
  //    dono aprovou — forçar 2+ colunas por causa só da largura da página
  //    deixava até meses levíssimos fragmentados à toa).
  // 2) Com esse piso, o preenchimento GULOSO (enche a coluna 1 até estourar
  //    `altura`, só aí passa pra próxima) fazia a 2ª coluna calculada ficar
  //    vazia na prática sempre que a altura generosa do mês "cheio" desse
  //    conta de tudo numa coluna só — resultado idêntico ao bug 1, por um
  //    caminho diferente. Corrigido calculando a altura TOTAL do conteúdo
  //    primeiro e DIVIDINDO pelo número de colunas — cada coluna recebe uma
  //    fatia-alvo do conteúdo, não "o que sobrar" depois que a 1ª encheu.
  const minimoColunasPorQuantidade = (n: number) => (n > 36 ? 4 : n > 22 ? 3 : n > 10 ? 2 : 1);
  let colunas = Math.max(1, minimoColunasPorQuantidade(grupos.length));
  let largColuna = (largura - (colunas - 1) * gapColuna) / colunas;
  let alturas = alturasParaLargura(largColuna);
  let alturaTotal = alturas.reduce((soma, h) => soma + h + gapItem, 0) - gapItem;
  while (alturaTotal / colunas > altura && colunas < 4) {
    colunas++;
    largColuna = (largura - (colunas - 1) * gapColuna) / colunas;
    alturas = alturasParaLargura(largColuna);
    alturaTotal = alturas.reduce((soma, h) => soma + h + gapItem, 0) - gapItem;
  }
  const alturaAlvoPorColuna = alturaTotal / colunas;

  let col = 0;
  let y = yTopo;
  let alturaUsadaNaColuna = 0;
  grupos.forEach((g, i) => {
    const h = alturas[i];
    // Passa pra próxima coluna ao ultrapassar a fatia-alvo dela (não só ao
    // estourar a altura disponível da página) — é isso que faz o conteúdo
    // se espalhar pelas colunas de verdade, equilibrado, em vez de empilhar
    // tudo na primeira coluna só porque cabia.
    if (alturaUsadaNaColuna + h > alturaAlvoPorColuna && col < colunas - 1) {
      col++;
      y = yTopo;
      alturaUsadaNaColuna = 0;
    }
    alturaUsadaNaColuna += h + gapItem;
    const xCol = x + col * (largColuna + gapColuna);
    const corCategoria = corCategoriaHex(g.categoria).dot;
    const chipLargura = Math.max(16, fonteBold.widthOfTextAtSize(g.rotulo, fonteTam) + 7);
    desenharPilula(pagina, { x: xCol, yTopo: y, largura: chipLargura, altura: chipAltura, color: hexParaRgb(corCategoria) });
    const chipTextoLargura = fonteBold.widthOfTextAtSize(g.rotulo, fonteTam);
    pagina.drawText(g.rotulo, {
      x: xCol + (chipLargura - chipTextoLargura) / 2,
      y: y + deslocamentoLinhaBase,
      size: fonteTam,
      font: fonteBold,
      color: corTextoContraste(corCategoria),
    });
    const linhasTitulo = quebrarEm2Linhas(fonteBold, g.titulo.toUpperCase(), fonteTam, largColuna - chipLargura - 7);
    linhasTitulo.forEach((linha, li) => {
      pagina.drawText(linha, {
        x: xCol + chipLargura + 7,
        y: y + deslocamentoLinhaBase - li * alturaLinha,
        size: fonteTam,
        font: fonteBold,
        color: WHITE,
      });
    });
    y -= h + gapItem;
  });
}

/**
 * Página de detalhe de 1 mês — pra onde o clique num mini-mês da visão geral
 * leva (ver adicionarLinkInterno em gerarCalendarioPdf). Cabeçalho e rodapé
 * BEM mais enxutos que o pôster de visão geral, de propósito: pedido real do
 * dono revisando com dados reais ("se tem vários eventos, diminui a arte") —
 * meses cheios (30-50 eventos agrupados) precisam de todo o espaço vertical
 * disponível pra legenda completa (desenharLegendaCompleta), que nunca corta
 * nada em "+N eventos". Link "← Voltar" no topo pra voltar pra visão geral —
 * sem ele, a página de detalhe seria um beco sem saída dentro do PDF.
 */
function desenharPaginaDetalheMes(
  pdf: PDFDocument,
  pagina: PDFPage,
  {
    ano,
    mes,
    eventosDoMes,
    fonte,
    fonteBold,
    fonteTitulo,
    logo,
    fundoCompleto,
    decoracaoRodape,
    paginaVoltar,
  }: {
    ano: number;
    mes: number;
    eventosDoMes: { dia: number; titulo: string; categoria: string }[];
    fonte: PDFFont;
    fonteBold: PDFFont;
    fonteTitulo: PDFFont;
    logo: PDFImage | null;
    fundoCompleto: PDFImage | null;
    decoracaoRodape: PDFImage | null;
    // null quando esta página não veio de um clique na visão geral (export
    // direto de 1 mês só, pelo modal) — nesse caso não tem pra onde voltar,
    // então o link "← Voltar" nem é desenhado.
    paginaVoltar: PDFPage | null;
  }
) {
  const SANGRIA = 1;
  if (fundoCompleto) {
    pagina.drawImage(fundoCompleto, { x: -SANGRIA, y: -SANGRIA, width: PAGE_W + SANGRIA * 2, height: PAGE_H + SANGRIA * 2 });
  } else {
    pagina.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: NAVY });
  }

  const MARGEM_LATERAL = 24;

  // "← Voltar" — sem isso a página de detalhe é um beco sem saída no PDF.
  // Só existe quando veio de um clique na visão geral (paginaVoltar != null).
  if (paginaVoltar) {
    // "<" em vez de "←": a fonte padrão (Helvetica/WinAnsi) não tem o glifo
    // de seta unicode — bug real (set/2026), quebrava a geração do PDF com
    // "WinAnsi cannot encode ←".
    const voltarTexto = "< Voltar ao calendário";
    const voltarTam = 10;
    pagina.drawText(voltarTexto, { x: MARGEM_LATERAL, y: PAGE_H - 22, size: voltarTam, font: fonteBold, color: YELLOW });
    const voltarLargura = fonteBold.widthOfTextAtSize(voltarTexto, voltarTam);
    adicionarLinkInterno(
      pdf,
      pagina,
      { x: MARGEM_LATERAL - 4, y: PAGE_H - 28, largura: voltarLargura + 8, altura: 18 },
      paginaVoltar
    );
  }

  // Tamanho do cabeçalho/grade/rodapé é ADAPTATIVO pela quantidade de
  // eventos do mês — não sempre pequeno. Pedido real do dono, revisando com
  // dados reais: "se tem vários eventos, diminui a arte" (só encolhe quando
  // PRECISA) — um mês leve (poucos eventos) deve continuar com a "arte"
  // grande e generosa igual ao pôster de visão geral; só um mês cheio (30+
  // eventos agrupados, ex.: setembro com 50) precisa ceder espaço da grade/
  // cabeçalho/rodapé pra legenda completa nunca cortar nada.
  const numGrupos = agruparEventosDoMes(eventosDoMes).length;
  const nivel = numGrupos > 30 ? "cheio" : numGrupos > 15 ? "medio" : "leve";
  const params = {
    leve: { tituloTam: 30, yTitulo: 58, subtituloTam: 16, ySubtitulo: 78, yCategorias: 96, escalaGrade: 2.0, yGrade: 116, rodapeH: 85, ilustracaoW: 90, logoW: 100 },
    medio: { tituloTam: 25, yTitulo: 50, subtituloTam: 14, ySubtitulo: 68, yCategorias: 86, escalaGrade: 1.65, yGrade: 104, rodapeH: 62, ilustracaoW: 58, logoW: 78 },
    cheio: { tituloTam: 20, yTitulo: 46, subtituloTam: 13, ySubtitulo: 63, yCategorias: 80, escalaGrade: 1.35, yGrade: 98, rodapeH: 46, ilustracaoW: 42, logoW: 62 },
  }[nivel];

  const titulo = "CALENDÁRIO";
  const tituloLargura = fonteTitulo.widthOfTextAtSize(titulo, params.tituloTam);
  pagina.drawText(titulo, { x: (PAGE_W - tituloLargura) / 2, y: PAGE_H - params.yTitulo, size: params.tituloTam, font: fonteTitulo, color: YELLOW });
  const subtitulo = `${MESES[mes - 1]}/${ano}`;
  const subtituloLargura = fonteTitulo.widthOfTextAtSize(subtitulo, params.subtituloTam);
  pagina.drawText(subtitulo, { x: (PAGE_W - subtituloLargura) / 2, y: PAGE_H - params.ySubtitulo, size: params.subtituloTam, font: fonteTitulo, color: WHITE });

  // Legenda de categorias — mesma faixa da visão geral, só reposicionada.
  const legendaCategoriasFonteTam = 6.5;
  const legendaCategoriasDot = 5;
  const itensLegendaCategorias = CATEGORIAS_EVENTO.map((cat) => ({
    cat,
    largura: legendaCategoriasDot + 4 + fonte.widthOfTextAtSize(cat, legendaCategoriasFonteTam),
  }));
  const espacoEntreItens = 12;
  const larguraTotalLegenda =
    itensLegendaCategorias.reduce((soma, it) => soma + it.largura, 0) + espacoEntreItens * (itensLegendaCategorias.length - 1);
  let xLegendaCategorias = (PAGE_W - larguraTotalLegenda) / 2;
  const yLegendaCategorias = PAGE_H - params.yCategorias;
  itensLegendaCategorias.forEach(({ cat, largura: larguraItem }) => {
    const corDot = corCategoriaHex(cat).dot;
    pagina.drawEllipse({
      x: xLegendaCategorias + legendaCategoriasDot / 2,
      y: yLegendaCategorias - legendaCategoriasFonteTam * 0.32,
      xScale: legendaCategoriasDot / 2,
      yScale: legendaCategoriasDot / 2,
      color: hexParaRgb(corDot),
    });
    pagina.drawText(cat, {
      x: xLegendaCategorias + legendaCategoriasDot + 4,
      y: yLegendaCategorias - legendaCategoriasFonteTam * 0.72,
      size: legendaCategoriasFonteTam,
      font: fonte,
      color: rgb(0.75, 0.8, 0.92),
    });
    xLegendaCategorias += larguraItem + espacoEntreItens;
  });

  // Grade do mês — tamanho tirado do nível calculado acima.
  const corPorDia = corPorDiaDoMes(eventosDoMes);
  const escalaGrade = params.escalaGrade;
  const cardW = CARD_W * escalaGrade;
  const cardH = CARD_H * escalaGrade;
  const gradeX = (PAGE_W - cardW) / 2;
  const gradeTopo = PAGE_H - params.yGrade;
  desenharGradeMes(pagina, { x: gradeX, yTopo: gradeTopo, largura: cardW, escala: escalaGrade, mes, ano, fonte, fonteBold, corPorDia });

  // Rodapé — também do nível calculado acima (só encolhe de verdade quando
  // o mês é cheio; leve/médio mantêm a ilustração e a logo com presença).
  const RODAPE_H = params.rodapeH;
  if (decoracaoRodape) {
    const larguraAlvo = params.ilustracaoW;
    const alturaAlvo = (decoracaoRodape.height / decoracaoRodape.width) * larguraAlvo;
    pagina.drawImage(decoracaoRodape, { x: -larguraAlvo * 0.08, y: -alturaAlvo * 0.1, width: larguraAlvo, height: alturaAlvo });
  }
  if (logo) {
    const larguraAlvo = params.logoW;
    const alturaAlvo = (logo.height / logo.width) * larguraAlvo;
    pagina.drawImage(logo, { x: (PAGE_W - larguraAlvo) / 2, y: 10, width: larguraAlvo, height: alturaAlvo });
  }

  // Legenda completa — ocupa toda a largura útil da página (bem mais que a
  // largura estreita do cartão do mês) e toda a altura que sobrar até o
  // rodapé, em colunas. É o motivo desta página existir.
  const legendaTopo = gradeTopo - cardH - 14;
  const legendaBase = RODAPE_H + 8;
  desenharLegendaCompleta(pagina, {
    x: MARGEM_LATERAL,
    yTopo: legendaTopo,
    largura: PAGE_W - MARGEM_LATERAL * 2,
    altura: legendaTopo - legendaBase,
    fonte,
    fonteBold,
    eventosDoMes,
  });
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
    fonteTitulo,
    logo,
    fundoCompleto,
    decoracaoRodape,
    tituloPagina,
    numeroPagina,
    totalPaginas,
  }: {
    meses: { ano: number; mes: number }[];
    eventosPorMes: Map<string, { dia: number; titulo: string; categoria: string }[]>;
    fonte: PDFFont;
    fonteBold: PDFFont;
    fonteTitulo: PDFFont;
    logo: PDFImage | null;
    fundoCompleto: PDFImage | null;
    decoracaoRodape: PDFImage | null;
    tituloPagina: string;
    numeroPagina: number;
    totalPaginas: number;
  }
): { ano: number; mes: number; x: number; y: number; largura: number; altura: number }[] {
  // Fundo: gradiente + decoração do canto superior direito já vêm PRÉ-COMPOSTOS
  // numa imagem só (gerada offline, não em runtime — ver script de geração do
  // asset). Bug real (set/2026): desenhar a decoração do canto como uma imagem
  // PNG com transparência separada, deslocada do canto da página (drawImage
  // com x/y != 0), faz o pdf-lib corromper a máscara de transparência — a
  // curva vira um triângulo de canto reto na hora de renderizar (reproduzido
  // igual em pypdfium2 E poppler, então é bug real de conteúdo do PDF gerado,
  // não só do visualizador). Fundir as duas imagens ANTES de embutir no PDF
  // evita o bug inteiro: só sobra UMA imagem opaca (sem canal alfa), desenhada
  // sem deslocamento nenhum de transparência em runtime.
  // Bug real (set/2026, achado testando o PDF em alta resolução): a imagem
  // desenhada exatamente do tamanho da página deixava uma emenda branca de
  // ~1pt na borda direita (a página do PDF por baixo é branca; arredondamento
  // na matriz de transformação da imagem não fechava 100% até a borda).
  // Sangria de 1pt pra cada lado resolve — a imagem passa um pouco da borda
  // da página (que corta o excesso), então nunca sobra branco visível.
  const SANGRIA = 1;
  if (fundoCompleto) {
    pagina.drawImage(fundoCompleto, { x: -SANGRIA, y: -SANGRIA, width: PAGE_W + SANGRIA * 2, height: PAGE_H + SANGRIA * 2 });
  } else {
    pagina.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: NAVY });
  }

  // Título — fonteTitulo (Poppins Bold), não fonteBold (Helvetica): é a
  // fonte de verdade do pôster original, só usada aqui e no subtítulo.
  const titulo = "CALENDÁRIO";
  const tituloTam = 40;
  const tituloLargura = fonteTitulo.widthOfTextAtSize(titulo, tituloTam);
  pagina.drawText(titulo, { x: (PAGE_W - tituloLargura) / 2, y: PAGE_H - 62, size: tituloTam, font: fonteTitulo, color: YELLOW });
  const subtituloTam = 16;
  const subtituloLargura = fonteTitulo.widthOfTextAtSize(tituloPagina, subtituloTam);
  pagina.drawText(tituloPagina, { x: (PAGE_W - subtituloLargura) / 2, y: PAGE_H - 84, size: subtituloTam, font: fonteTitulo, color: WHITE });
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

  // Legenda de categorias — uma fileira com bolinha + nome de cada categoria
  // (mesma paleta da tela /calendario), logo abaixo do subtítulo/paginação.
  // Pedido do dono: no topo (perto do título), não no rodapé — sem isso a
  // cor por categoria na grade/legenda de cada mês não tem como ser lida.
  const legendaCategoriasFonteTam = 6.5;
  const legendaCategoriasDot = 5;
  const itensLegendaCategorias = CATEGORIAS_EVENTO.map((cat) => ({
    cat,
    largura: legendaCategoriasDot + 4 + fonte.widthOfTextAtSize(cat, legendaCategoriasFonteTam),
  }));
  const espacoEntreItens = 12;
  const larguraTotalLegenda =
    itensLegendaCategorias.reduce((soma, it) => soma + it.largura, 0) + espacoEntreItens * (itensLegendaCategorias.length - 1);
  let xLegendaCategorias = (PAGE_W - larguraTotalLegenda) / 2;
  const yLegendaCategorias = PAGE_H - 108;
  itensLegendaCategorias.forEach(({ cat, largura: larguraItem }) => {
    const corDot = corCategoriaHex(cat).dot;
    pagina.drawEllipse({
      x: xLegendaCategorias + legendaCategoriasDot / 2,
      y: yLegendaCategorias - legendaCategoriasFonteTam * 0.32,
      xScale: legendaCategoriasDot / 2,
      yScale: legendaCategoriasDot / 2,
      color: hexParaRgb(corDot),
    });
    pagina.drawText(cat, {
      x: xLegendaCategorias + legendaCategoriasDot + 4,
      y: yLegendaCategorias - legendaCategoriasFonteTam * 0.72,
      size: legendaCategoriasFonteTam,
      font: fonte,
      color: rgb(0.75, 0.8, 0.92),
    });
    xLegendaCategorias += larguraItem + espacoEntreItens;
  });

  const MARGEM_LATERAL = 24;
  // Bug real (set/2026, reportado com o PDF gerado em mãos): sobrava uma faixa
  // enorme de navy vazio entre o subtítulo e a grade de meses. Duas causas
  // somadas: (1) a margem de topo reservada (gridTopoMax) era maior do que o
  // subtítulo realmente precisa, e (2) a grade ficava CENTRALIZADA dentro da
  // faixa disponível sempre que a altura não era o fator limitante — e nesse
  // pôster a largura é que limita a escala dos cartões em todos os layouts
  // do modal (1/3/6/12 meses), então sempre sobrava altura, e metade dela
  // virava margem morta em cima (empurrando a grade pra baixo) e a outra
  // metade em baixo. Agora a grade começa colada logo abaixo da legenda de
  // categorias, e o espaço que sobra vira headroom EXTRA pra legenda de cada
  // mês (mais eventos visíveis antes de precisar resumir em "+N eventos").
  const gridTopo = PAGE_H - 128;
  const gridBaseMax = 92; // espaço reservado pro rodapé (logo + ilustração)
  const availW = PAGE_W - MARGEM_LATERAL * 2;
  const availH = gridTopo - gridBaseMax;

  const { cols, rows } = layoutPara(meses.length);
  const naiveW = cols * CARD_W + (cols - 1) * GAP;
  // A escala do cartão depende só da largura disponível (é sempre o fator
  // limitante nos layouts expostos no modal — ver comentário acima); a altura
  // não entra mais aqui, ela decide o headroom da legenda logo abaixo.
  const escala = Math.min(availW / naiveW, ESCALA_MAXIMA);

  const cardW = CARD_W * escala;
  const cardHEscalado = CARD_H * escala;
  const gap = GAP * escala;
  // Altura de linha da grade: cartão + o que sobrar de availH pra legenda,
  // dividido entre as linhas — nunca menos que o piso mínimo (LEGENDA_HEADROOM),
  // pra sobrar espaço decente mesmo em layouts hipotéticos com muitas linhas.
  const alturaDisponivelPorLinha = (availH - (rows - 1) * gap) / rows;
  const legendaHeadroom = Math.max(LEGENDA_HEADROOM * escala, alturaDisponivelPorLinha - cardHEscalado);
  const linhaAltura = cardHEscalado + legendaHeadroom;
  const gridW = cols * cardW + (cols - 1) * gap;
  const gridH = rows * linhaAltura + (rows - 1) * gap;
  const inicioX = MARGEM_LATERAL + (availW - gridW) / 2;
  // Só sobra alguma folga verticalmente se o piso mínimo "venceu" o cálculo
  // acima (caso raro, layout hipotético fora de 1/3/6/12 meses) — nesse caso
  // ainda centraliza, em vez de deixar a diferença acumulada só embaixo.
  const inicioYTopo = gridTopo - (availH - gridH) / 2;

  // Retângulo (card + legenda) de cada mini-mês desenhado — devolvido pro
  // chamador poder sobrepor um link clicável ali em cima (ver "click no mês
  // pra abrir o detalhe", gerarCalendarioPdf), só faz sentido quando a
  // página mostra vários meses de uma vez (não no export de 1 mês só).
  const retangulosMeses: { ano: number; mes: number; x: number; y: number; largura: number; altura: number }[] = [];
  meses.forEach(({ ano, mes }, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = inicioX + col * (cardW + gap);
    const yTopo = inicioYTopo - row * (linhaAltura + gap);
    const eventosDoMes = eventosPorMes.get(`${ano}-${mes}`) ?? [];
    const corPorDia = corPorDiaDoMes(eventosDoMes);
    desenharMiniMes(pagina, { x, yTopo, largura: cardW, escala, legendaHeadroom, mes, ano, fonte, fonteBold, corPorDia, eventosDoMes });
    retangulosMeses.push({ ano, mes, x, y: yTopo - linhaAltura, largura: cardW, altura: linhaAltura });
  });

  // Rodapé: ilustração (canto inferior esquerdo, sangrando) + logo (centralizada)
  if (decoracaoRodape) {
    const larguraAlvo = 105;
    const alturaAlvo = (decoracaoRodape.height / decoracaoRodape.width) * larguraAlvo;
    pagina.drawImage(decoracaoRodape, { x: -8, y: -10, width: larguraAlvo, height: alturaAlvo });
  }
  if (logo) {
    const larguraAlvo = 110;
    const alturaAlvo = (logo.height / logo.width) * larguraAlvo;
    pagina.drawImage(logo, { x: (PAGE_W - larguraAlvo) / 2, y: 24, width: larguraAlvo, height: alturaAlvo });
  }

  return retangulosMeses;
}

// Selo "15 anos" só faz sentido no ano de aniversário — a referência de 2027
// usa o logo liso ("logo-cda-sem-selo.png", extraído do próprio pôster
// original) porque em 2027 a escola não completa mais 15 anos. Só 2026 leva
// o selo; qualquer outro ano (passado ou futuro) usa o logo liso.
const ANO_ANIVERSARIO_15 = 2026;

export async function gerarCalendarioPdf({
  meses,
  eventosPorMes,
}: {
  meses: { ano: number; mes: number }[];
  eventosPorMes: Map<string, EventoCalendarioPdf[]>;
}): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const primeiro = meses[0];
  pdf.setTitle(`Calendário — ${MESES[primeiro.mes - 1]} ${primeiro.ano} — Escola CDA`);
  pdf.setAuthor("Escola CDA");
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fonteTitulo = await embarcarFonteTitulo(pdf, fonteBold);
  const logoComSelo = await embarcarImagemPublica(pdf, "logo-cda.png");
  const logoSemSelo = await embarcarImagemPublica(pdf, "logo-cda-sem-selo.png");
  const fundoCompleto = await embarcarImagemPublica(pdf, "calendario-fundo-completo.png");
  const decoracaoRodape = await embarcarImagemPublica(pdf, "calendario-decoracao-rodape.png");

  // Agrupa eventos por dia dentro de cada mês (chave "ano-mes")
  const eventosPorMesDia = new Map<string, { dia: number; titulo: string; categoria: string }[]>();
  for (const [chave, eventos] of eventosPorMes) {
    eventosPorMesDia.set(
      chave,
      eventos.map((e) => ({ dia: e.data.getUTCDate(), titulo: e.titulo, categoria: e.categoria }))
    );
  }

  // Export de 1 mês só (opção do modal) usa direto o mesmo layout compacto
  // (sem "+N eventos", legenda completa em colunas) da página de detalhe que
  // se abre ao clicar num mês na visão geral — mesma experiência pros dois
  // casos, sem precisar passar pela visão geral primeiro. Sem link "← Voltar"
  // aqui (não existe visão geral pra voltar, é um PDF de 1 página só).
  if (meses.length === 1) {
    const { ano, mes } = meses[0];
    pdf.setTitle(`Calendário — ${MESES[mes - 1]} ${ano} — Escola CDA`);
    const pagina = pdf.addPage([PAGE_W, PAGE_H]);
    const logo = ano === ANO_ANIVERSARIO_15 ? logoComSelo : logoSemSelo;
    desenharPaginaDetalheMes(pdf, pagina, {
      ano,
      mes,
      eventosDoMes: eventosPorMesDia.get(`${ano}-${mes}`) ?? [],
      fonte,
      fonteBold,
      fonteTitulo,
      logo,
      fundoCompleto,
      decoracaoRodape,
      paginaVoltar: null,
    });
    const bytesUmMes = await pdf.save();
    return `data:application/pdf;base64,${Buffer.from(bytesUmMes).toString("base64")}`;
  }

  // Pôster comporta até 12 mini-meses numa página só — período maior (ex.:
  // "2 anos") vira várias páginas do mesmo design, 12 meses por vez.
  const MESES_POR_PAGINA = 12;
  const paginas: { ano: number; mes: number }[][] = [];
  for (let i = 0; i < meses.length; i += MESES_POR_PAGINA) {
    paginas.push(meses.slice(i, i + MESES_POR_PAGINA));
  }

  // Retângulos dos mini-meses de cada página de visão geral, coletados pra
  // virar link clicável depois que as páginas de detalhe existirem (o link
  // aponta pra `PDFRef` de uma página que só é criada no passo seguinte).
  const retangulosParaLink: {
    paginaOverview: PDFPage;
    ano: number;
    mes: number;
    x: number;
    y: number;
    largura: number;
    altura: number;
  }[] = [];

  paginas.forEach((mesesDaPagina, indice) => {
    const pagina = pdf.addPage([PAGE_W, PAGE_H]);
    const logo = mesesDaPagina[0].ano === ANO_ANIVERSARIO_15 ? logoComSelo : logoSemSelo;
    const retangulos = desenharPagina(pagina, {
      meses: mesesDaPagina,
      eventosPorMes: eventosPorMesDia,
      fonte,
      fonteBold,
      fonteTitulo,
      logo,
      fundoCompleto,
      decoracaoRodape,
      tituloPagina: construirSubtitulo(mesesDaPagina),
      numeroPagina: indice + 1,
      totalPaginas: paginas.length,
    });
    // Só faz sentido linkar quando a página mostra VÁRIOS meses — no export
    // de 1 mês só a própria página já É o detalhe, não tem pra onde "expandir".
    if (mesesDaPagina.length > 1) {
      retangulos.forEach((r) => retangulosParaLink.push({ paginaOverview: pagina, ...r }));
    }
  });

  // Clicar num mini-mês da visão geral abre uma página de detalhe cheia
  // (mesmo layout do export de 1 mês só, sem "+N eventos" escondendo nada)
  // — pedido do dono: "clico em janeiro e ele abre". Uma página de detalhe
  // por mês distinto pedido, anexada no fim do documento.
  if (retangulosParaLink.length > 0) {
    const mesesUnicos = new Map<string, { ano: number; mes: number }>();
    const overviewPorMes = new Map<string, PDFPage>(); // pra onde o "← Voltar" de cada mês deve apontar
    for (const r of retangulosParaLink) {
      mesesUnicos.set(`${r.ano}-${r.mes}`, { ano: r.ano, mes: r.mes });
      overviewPorMes.set(`${r.ano}-${r.mes}`, r.paginaOverview);
    }

    const paginaDetalhePorMes = new Map<string, PDFPage>();
    for (const { ano, mes } of mesesUnicos.values()) {
      const paginaDetalhe = pdf.addPage([PAGE_W, PAGE_H]);
      const logo = ano === ANO_ANIVERSARIO_15 ? logoComSelo : logoSemSelo;
      const paginaVoltar = overviewPorMes.get(`${ano}-${mes}`)!;
      desenharPaginaDetalheMes(pdf, paginaDetalhe, {
        ano,
        mes,
        eventosDoMes: eventosPorMesDia.get(`${ano}-${mes}`) ?? [],
        fonte,
        fonteBold,
        fonteTitulo,
        logo,
        fundoCompleto,
        decoracaoRodape,
        paginaVoltar,
      });
      paginaDetalhePorMes.set(`${ano}-${mes}`, paginaDetalhe);
    }

    for (const r of retangulosParaLink) {
      const destino = paginaDetalhePorMes.get(`${r.ano}-${r.mes}`);
      if (destino) adicionarLinkInterno(pdf, r.paginaOverview, r, destino);
    }
  }

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}
