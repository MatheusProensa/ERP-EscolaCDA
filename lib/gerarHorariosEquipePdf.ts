import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  NAVY, YELLOW, BORDER, TEXT2, TEXT3, WHITE, BLACK, PAGE_W, PAGE_H, MARGIN, HEADER_H,
  embarcarLogo, desenharLogo, desenharSlogan,
} from "./gerarRelatorioPdf";
import type { ItemEscalaBloco, PessoaEvento } from "@/components/modules/horarios-equipe/types";

// Mesma paleta categórica (cat1..cat6) usada em Badge/CardapioPublicoCard —
// convertida pro hex real, já que o PDF não lê variável CSS. Serve pra dar a
// mesma cor de identidade por contraturno que a tela usa (corPorTexto em
// EscalaBlocoCard.tsx), pra folhear o PDF impresso e reconhecer o bloco pela
// cor igual na tela.
const CORES_CATEGORICAS = ["#1a6fd8", "#0b7a70", "#7c3aed", "#be1e63", "#b5670c", "#4a5b7d"];
const VERDE = "#16a34a";
const CINZA_SAIDA = "#5f6f89";

function hexParaRgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
function corSolida(hex: string) {
  const c = hexParaRgb(hex);
  return rgb(c.r, c.g, c.b);
}

/** Mesmo hash de EscalaBlocoCard.tsx (corPorTexto) — precisa dar a MESMA cor
 * pro MESMO título aqui e na tela, então é literalmente o mesmo algoritmo,
 * só que devolvendo hex em vez de BadgeVariant. */
function corPorTexto(texto: string): string {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return CORES_CATEGORICAS[h % CORES_CATEGORICAS.length];
}
function grupoDoTitulo(titulo: string): string {
  return titulo.split(" / ")[0].trim();
}

function quebrarLinhas(font: PDFFont, texto: string, size: number, maxWidth: number): string[] {
  const linhas: string[] = [];
  for (const bruta of texto.split("\n")) {
    if (bruta === "") {
      linhas.push("");
      continue;
    }
    if (font.widthOfTextAtSize(bruta, size) <= maxWidth) {
      linhas.push(bruta);
      continue;
    }
    let atual = "";
    for (const palavra of bruta.split(" ")) {
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

/** Trunca um texto de uma pessoa+horário+nota pra caber numa linha só da
 * coluna (evita quebrar o card inteiro por causa de uma nota comprida). */
function truncarLinha(font: PDFFont, texto: string, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(texto, size) <= maxWidth) return texto;
  let resultado = texto;
  while (resultado.length > 1 && font.widthOfTextAtSize(resultado + "…", size) > maxWidth) {
    resultado = resultado.slice(0, -1);
  }
  return resultado + "…";
}

const PAD_X = 12;
const PAD_Y = 10;
const LINE_H = 13;
const TITULO_SIZE = 11;
const GAP_ENTRE_CARDS = 10;
const LARGURA_COL = (PAGE_W - MARGIN * 2 - PAD_X * 2 - 24) / 2;

/** PDF timbrado dos Horários da Equipe — um card por turno/contraturno (linha
 * do tempo de entradas/saídas, igual à tela) seguido dos avisos de
 * organização, com quebra de página automática. Nunca inventa horário: bloco
 * sem hora certa (ex.: Secretaria) sai como lista simples, igual na tela. */
export async function gerarHorariosEquipePdf({ ano, blocos }: { ano: number; blocos: ItemEscalaBloco[] }): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Horários da Equipe — ${ano} — Escola CDA`);
  pdf.setAuthor("Escola CDA");
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embarcarLogo(pdf);
  const geradoEm = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  let pagina!: PDFPage;
  let y = 0;

  function desenharCabecalho() {
    pagina.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: NAVY });
    pagina.drawRectangle({ x: 0, y: PAGE_H - HEADER_H - 3, width: PAGE_W, height: 3, color: YELLOW });
    desenharLogo(pagina, logo, PAGE_H);
    desenharSlogan(pagina, fonte, PAGE_H);

    const titulo = `Horários da Equipe · Ano letivo ${ano}`;
    const tituloLargura = fonteBold.widthOfTextAtSize(titulo, 14);
    pagina.drawText(titulo, { x: PAGE_W - MARGIN - tituloLargura, y: PAGE_H - 28, size: 14, font: fonteBold, color: WHITE });
    const geradoTexto = `Gerado em ${geradoEm}`;
    const geradoLargura = fonte.widthOfTextAtSize(geradoTexto, 8.5);
    pagina.drawText(geradoTexto, {
      x: PAGE_W - MARGIN - geradoLargura, y: PAGE_H - 44, size: 8.5, font: fonte, color: rgb(0.75, 0.8, 0.9),
    });
  }

  function novaPagina() {
    pagina = pdf.addPage([PAGE_W, PAGE_H]);
    desenharCabecalho();
    y = PAGE_H - HEADER_H - 20;
  }

  /** Uma coluna (Entradas ou Saídas) dentro do card: rótulo + linhas
   * "HH:mm  Nome — nota", ou lista simples sem horário quando o bloco não
   * tem hora certa (mesma regra da tela). */
  function desenharColuna(x: number, yTopo: number, rotulo: string, corRotulo: string, itens: PessoaEvento[], linhas: number) {
    pagina.drawText(rotulo, { x, y: yTopo, size: 7.5, font: fonteBold, color: corSolida(corRotulo) });
    const temHorario = itens.some((it) => it.horario);
    itens.forEach((it, i) => {
      const yLinha = yTopo - 14 - i * LINE_H;
      if (temHorario && it.horario) {
        pagina.drawText(it.horario, { x, y: yLinha, size: 8.5, font: fonteBold, color: NAVY });
        const largHorario = fonteBold.widthOfTextAtSize(it.horario, 8.5) + 6;
        const resto = it.nota ? `${it.pessoa} — ${it.nota}` : it.pessoa;
        pagina.drawText(truncarLinha(fonte, resto, 8.5, LARGURA_COL - largHorario), {
          x: x + largHorario, y: yLinha, size: 8.5, font: fonte, color: BLACK,
        });
      } else {
        const texto = it.nota ? `${it.pessoa} — ${it.nota}` : it.pessoa;
        pagina.drawText(truncarLinha(fonte, texto, 8.5, LARGURA_COL), { x, y: yLinha, size: 8.5, font: fonte, color: BLACK });
      }
    });
    if (itens.length === 0) {
      pagina.drawText("—", { x, y: yTopo - 14, size: 8.5, font: fonte, color: TEXT3 });
    }
    void linhas;
  }

  /** Altura total que o card de turno vai ocupar, calculada ANTES de
   * desenhar — é o que permite decidir se cabe na página atual ou precisa
   * de uma nova, sem cortar o card no meio. */
  function alturaCardTurno(bloco: ItemEscalaBloco): number {
    const linhas = Math.max(1, bloco.entradas?.length ?? 0, bloco.saidas?.length ?? 0);
    const alturaHorarios = bloco.horariosReferencia.length > 0 ? 12 : 0;
    return PAD_Y * 2 + TITULO_SIZE + 4 + alturaHorarios + 12 + linhas * LINE_H;
  }

  function desenharCardTurno(bloco: ItemEscalaBloco) {
    const altura = alturaCardTurno(bloco);
    if (y - altura < MARGIN) novaPagina();

    const corHex = corPorTexto(grupoDoTitulo(bloco.titulo));
    const yTopo = y;
    pagina.drawRectangle({ x: MARGIN, y: yTopo - altura, width: PAGE_W - MARGIN * 2, height: altura, color: rgb(0.985, 0.988, 0.995), borderColor: BORDER, borderWidth: 0.75 });
    pagina.drawRectangle({ x: MARGIN, y: yTopo - altura, width: 3, height: altura, color: corSolida(corHex) });

    let yCursor = yTopo - PAD_Y - TITULO_SIZE + 2;
    pagina.drawText(bloco.titulo, { x: MARGIN + PAD_X, y: yCursor, size: TITULO_SIZE, font: fonteBold, color: NAVY });
    yCursor -= 4;

    if (bloco.horariosReferencia.length > 0) {
      yCursor -= 12;
      pagina.drawText(`Horários de referência: ${bloco.horariosReferencia.join(", ")}`, {
        x: MARGIN + PAD_X, y: yCursor, size: 7.5, font: fonte, color: TEXT2,
      });
    }
    yCursor -= 12;

    const linhas = Math.max(1, bloco.entradas?.length ?? 0, bloco.saidas?.length ?? 0);
    const xColEntrada = MARGIN + PAD_X;
    const xColSaida = MARGIN + PAD_X + LARGURA_COL + 24;
    desenharColuna(xColEntrada, yCursor, "ENTRADAS", VERDE, bloco.entradas ?? [], linhas);
    desenharColuna(xColSaida, yCursor, "SAÍDAS", CINZA_SAIDA, bloco.saidas ?? [], linhas);

    y = yTopo - altura - GAP_ENTRE_CARDS;
  }

  function desenharCardNota(bloco: ItemEscalaBloco) {
    const larguraTexto = PAGE_W - MARGIN * 2 - PAD_X * 2;
    const linhasTexto = quebrarLinhas(fonte, bloco.conteudoLivre ?? "", 8.5, larguraTexto);
    const alturaHorarios = bloco.horariosReferencia.length > 0 ? 12 : 0;
    const altura = PAD_Y * 2 + TITULO_SIZE + 4 + alturaHorarios + 10 + linhasTexto.length * 11;

    if (y - altura < MARGIN) novaPagina();

    const yTopo = y;
    pagina.drawRectangle({ x: MARGIN, y: yTopo - altura, width: PAGE_W - MARGIN * 2, height: altura, color: rgb(0.985, 0.988, 0.995), borderColor: BORDER, borderWidth: 0.75 });
    pagina.drawRectangle({ x: MARGIN, y: yTopo - altura, width: 3, height: altura, color: TEXT3 });

    let yCursor = yTopo - PAD_Y - TITULO_SIZE + 2;
    pagina.drawText(bloco.titulo, { x: MARGIN + PAD_X, y: yCursor, size: TITULO_SIZE, font: fonteBold, color: NAVY });
    yCursor -= 4;

    if (bloco.horariosReferencia.length > 0) {
      yCursor -= 12;
      pagina.drawText(`Horários de referência: ${bloco.horariosReferencia.join(", ")}`, {
        x: MARGIN + PAD_X, y: yCursor, size: 7.5, font: fonte, color: TEXT2,
      });
    }
    yCursor -= 14;

    linhasTexto.forEach((linha, i) => {
      pagina.drawText(linha, { x: MARGIN + PAD_X, y: yCursor - i * 11, size: 8.5, font: fonte, color: BLACK });
    });

    y = yTopo - altura - GAP_ENTRE_CARDS;
  }

  novaPagina();

  const turnos = blocos.filter((b) => b.tipo === "TURNO");
  const notas = blocos.filter((b) => b.tipo === "NOTA");

  if (turnos.length === 0 && notas.length === 0) {
    pagina.drawText("Ainda não tem escala cadastrada pra este ano.", { x: MARGIN, y: y - 6, size: 10, font: fonte, color: TEXT2 });
  }

  for (const bloco of turnos) desenharCardTurno(bloco);

  if (notas.length > 0) {
    // GAP_ENTRE_CARDS (10pt) já foi descontado depois do último card de turno —
    // não é suficiente sozinho pra abrir espaço da borda até a BASELINE de um
    // texto bold de 10pt (o ascent dele já come uns 7-8pt disso). +8pt aqui
    // garante respiro visível, não só matematicamente positivo.
    y -= 8;
    if (y - 22 < MARGIN) novaPagina();
    pagina.drawText("ORGANIZAÇÃO E AVISOS", { x: MARGIN, y, size: 10, font: fonteBold, color: TEXT2 });
    y -= 18;
    for (const bloco of notas) desenharCardNota(bloco);
  }

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}
