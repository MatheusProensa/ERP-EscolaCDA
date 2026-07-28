import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const NAVY = rgb(0x0d / 255, 0x1f / 255, 0x4e / 255);
const YELLOW = rgb(0xf5 / 255, 0xc4 / 255, 0);
const BORDER = rgb(0xe2 / 255, 0xe8 / 255, 0xf2 / 255);
const TEXT2 = rgb(0x5a / 255, 0x6a / 255, 0x85 / 255);
const TEXT3 = rgb(0x9a / 255, 0xaa / 255, 0xbe / 255);
const ROW_ALT = rgb(0xf5 / 255, 0xf8 / 255, 0xfc / 255);
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0.05, 0.08, 0.14);

const PAGE_W = 842;
const PAGE_H = 595;
const MARGIN = 36;
const HEADER_H = 66;
const ROW_H = 22;
const HEAD_ROW_H = 24;

export type ColunaRelatorio = { chave: string; label: string; largura: number };

function truncar(font: PDFFont, texto: string, tamanho: number, larguraMax: number): string {
  if (font.widthOfTextAtSize(texto, tamanho) <= larguraMax) return texto;
  let resultado = texto;
  while (resultado.length > 1 && font.widthOfTextAtSize(resultado + "…", tamanho) > larguraMax) {
    resultado = resultado.slice(0, -1);
  }
  return resultado + "…";
}

export async function gerarRelatorioPdf({
  titulo,
  subtitulo,
  colunas,
  linhas,
}: {
  titulo: string;
  subtitulo?: string;
  colunas: ColunaRelatorio[];
  linhas: Record<string, string>[];
}): Promise<string> {
  const pdf = await PDFDocument.create();
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const larguraTabela = colunas.reduce((acc, c) => acc + c.largura, 0);
  const escala = Math.min(1, (PAGE_W - MARGIN * 2) / larguraTabela);
  const colunasEscaladas = colunas.map((c) => ({ ...c, largura: c.largura * escala }));

  const geradoEm = new Date().toLocaleString("pt-BR");
  const linhasPorPagina = Math.max(1, Math.floor((PAGE_H - MARGIN * 2 - HEADER_H - HEAD_ROW_H - 24) / ROW_H));
  const totalPaginas = Math.max(1, Math.ceil(linhas.length / linhasPorPagina));

  function desenharCabecalho(pagina: PDFPage, numeroPagina: number) {
    pagina.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: NAVY });
    pagina.drawRectangle({ x: 0, y: PAGE_H - HEADER_H - 3, width: PAGE_W, height: 3, color: YELLOW });

    pagina.drawText("ESCOLA CDA", {
      x: MARGIN,
      y: PAGE_H - 30,
      size: 18,
      font: fonteBold,
      color: WHITE,
    });
    pagina.drawText("Onde, há 15 anos, família e escola sonham juntas", {
      x: MARGIN,
      y: PAGE_H - 46,
      size: 8.5,
      font: fonte,
      color: rgb(0.75, 0.8, 0.9),
    });

    const tituloLargura = fonteBold.widthOfTextAtSize(titulo, 14);
    pagina.drawText(titulo, {
      x: PAGE_W - MARGIN - tituloLargura,
      y: PAGE_H - 28,
      size: 14,
      font: fonteBold,
      color: WHITE,
    });
    const geradoTexto = `Gerado em ${geradoEm} · página ${numeroPagina}/${totalPaginas}`;
    const geradoLargura = fonte.widthOfTextAtSize(geradoTexto, 8.5);
    pagina.drawText(geradoTexto, {
      x: PAGE_W - MARGIN - geradoLargura,
      y: PAGE_H - 44,
      size: 8.5,
      font: fonte,
      color: rgb(0.75, 0.8, 0.9),
    });
  }

  function desenharCabecalhoTabela(pagina: PDFPage, y: number) {
    pagina.drawRectangle({ x: MARGIN, y: y - HEAD_ROW_H, width: larguraTabela * escala, height: HEAD_ROW_H, color: NAVY });
    let x = MARGIN;
    for (const col of colunasEscaladas) {
      pagina.drawText(truncar(fonteBold, col.label.toUpperCase(), 8, col.largura - 10), {
        x: x + 6,
        y: y - HEAD_ROW_H + 8,
        size: 8,
        font: fonteBold,
        color: WHITE,
      });
      x += col.largura;
    }
  }

  let pagina = pdf.addPage([PAGE_W, PAGE_H]);
  let paginaAtual = 1;
  desenharCabecalho(pagina, paginaAtual);

  if (subtitulo) {
    pagina.drawText(subtitulo, {
      x: MARGIN,
      y: PAGE_H - HEADER_H - 16,
      size: 10,
      font: fonte,
      color: TEXT2,
    });
  }

  let y = PAGE_H - HEADER_H - (subtitulo ? 30 : 16);
  desenharCabecalhoTabela(pagina, y);
  y -= HEAD_ROW_H;

  linhas.forEach((linha, i) => {
    const indiceNaPagina = i % linhasPorPagina;

    if (i > 0 && indiceNaPagina === 0) {
      pagina = pdf.addPage([PAGE_W, PAGE_H]);
      paginaAtual += 1;
      desenharCabecalho(pagina, paginaAtual);
      y = PAGE_H - HEADER_H - 16;
      desenharCabecalhoTabela(pagina, y);
      y -= HEAD_ROW_H;
    }

    if (indiceNaPagina % 2 === 1) {
      pagina.drawRectangle({ x: MARGIN, y: y - ROW_H, width: larguraTabela * escala, height: ROW_H, color: ROW_ALT });
    }

    let x = MARGIN;
    for (const col of colunasEscaladas) {
      const valor = truncar(fonte, linha[col.chave] ?? "", 9, col.largura - 12);
      pagina.drawText(valor, {
        x: x + 6,
        y: y - ROW_H + 7,
        size: 9,
        font: fonte,
        color: BLACK,
      });
      x += col.largura;
    }

    pagina.drawLine({
      start: { x: MARGIN, y: y - ROW_H },
      end: { x: MARGIN + larguraTabela * escala, y: y - ROW_H },
      thickness: 0.5,
      color: BORDER,
    });

    y -= ROW_H;
  });

  if (linhas.length === 0) {
    pagina.drawText("Nenhum registro encontrado.", {
      x: MARGIN + 6,
      y: y - ROW_H + 7,
      size: 9,
      font: fonte,
      color: TEXT3,
    });
  }

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}

export type SecaoRelatorio = {
  titulo: string;
  subtitulo?: string;
  colunas: ColunaRelatorio[];
  linhas: Record<string, string>[];
};

/** Mesmo visual do gerarRelatorioPdf, mas com várias seções (cada uma com sua própria
 * tabela/colunas), sempre começando em página nova pra ficar bem separado. */
export async function gerarRelatorioPdfMultiSecao({
  titulo,
  secoes,
}: {
  titulo: string;
  secoes: SecaoRelatorio[];
}): Promise<string> {
  const pdf = await PDFDocument.create();
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const geradoEm = new Date().toLocaleString("pt-BR");

  // Cada seção ocupa pelo menos 1 página, então o total é a soma de páginas por seção.
  const paginasPorSecao = secoes.map((secao) => {
    const linhasPorPagina = Math.max(1, Math.floor((PAGE_H - MARGIN * 2 - HEADER_H - 40 - HEAD_ROW_H - 24) / ROW_H));
    return Math.max(1, Math.ceil(secao.linhas.length / linhasPorPagina));
  });
  const totalPaginas = paginasPorSecao.reduce((a, b) => a + b, 0);
  let paginaAtual = 0;

  function desenharCabecalho(pagina: PDFPage, tituloSecao: string) {
    pagina.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: NAVY });
    pagina.drawRectangle({ x: 0, y: PAGE_H - HEADER_H - 3, width: PAGE_W, height: 3, color: YELLOW });

    pagina.drawText("ESCOLA CDA", { x: MARGIN, y: PAGE_H - 30, size: 18, font: fonteBold, color: WHITE });
    pagina.drawText("Onde, há 15 anos, família e escola sonham juntas", {
      x: MARGIN,
      y: PAGE_H - 46,
      size: 8.5,
      font: fonte,
      color: rgb(0.75, 0.8, 0.9),
    });

    const tituloCompleto = `${titulo} · ${tituloSecao}`;
    const tituloLargura = fonteBold.widthOfTextAtSize(tituloCompleto, 14);
    pagina.drawText(tituloCompleto, {
      x: PAGE_W - MARGIN - tituloLargura,
      y: PAGE_H - 28,
      size: 14,
      font: fonteBold,
      color: WHITE,
    });
    const geradoTexto = `Gerado em ${geradoEm} · página ${paginaAtual}/${totalPaginas}`;
    const geradoLargura = fonte.widthOfTextAtSize(geradoTexto, 8.5);
    pagina.drawText(geradoTexto, {
      x: PAGE_W - MARGIN - geradoLargura,
      y: PAGE_H - 44,
      size: 8.5,
      font: fonte,
      color: rgb(0.75, 0.8, 0.9),
    });
  }

  for (const secao of secoes) {
    const larguraTabela = secao.colunas.reduce((acc, c) => acc + c.largura, 0);
    const escala = Math.min(1, (PAGE_W - MARGIN * 2) / larguraTabela);
    const colunasEscaladas = secao.colunas.map((c) => ({ ...c, largura: c.largura * escala }));
    const linhasPorPagina = Math.max(1, Math.floor((PAGE_H - MARGIN * 2 - HEADER_H - 40 - HEAD_ROW_H - 24) / ROW_H));

    function desenharCabecalhoTabela(pagina: PDFPage, y: number) {
      pagina.drawRectangle({ x: MARGIN, y: y - HEAD_ROW_H, width: larguraTabela * escala, height: HEAD_ROW_H, color: NAVY });
      let x = MARGIN;
      for (const col of colunasEscaladas) {
        pagina.drawText(truncar(fonteBold, col.label.toUpperCase(), 8, col.largura - 10), {
          x: x + 6,
          y: y - HEAD_ROW_H + 8,
          size: 8,
          font: fonteBold,
          color: WHITE,
        });
        x += col.largura;
      }
    }

    paginaAtual += 1;
    let pagina = pdf.addPage([PAGE_W, PAGE_H]);
    desenharCabecalho(pagina, secao.titulo);

    if (secao.subtitulo) {
      pagina.drawText(secao.subtitulo, { x: MARGIN, y: PAGE_H - HEADER_H - 16, size: 10, font: fonte, color: TEXT2 });
    }

    let y = PAGE_H - HEADER_H - (secao.subtitulo ? 30 : 16);
    desenharCabecalhoTabela(pagina, y);
    y -= HEAD_ROW_H;

    secao.linhas.forEach((linha, i) => {
      const indiceNaPagina = i % linhasPorPagina;

      if (i > 0 && indiceNaPagina === 0) {
        paginaAtual += 1;
        pagina = pdf.addPage([PAGE_W, PAGE_H]);
        desenharCabecalho(pagina, secao.titulo);
        y = PAGE_H - HEADER_H - 16;
        desenharCabecalhoTabela(pagina, y);
        y -= HEAD_ROW_H;
      }

      if (indiceNaPagina % 2 === 1) {
        pagina.drawRectangle({ x: MARGIN, y: y - ROW_H, width: larguraTabela * escala, height: ROW_H, color: ROW_ALT });
      }

      let x = MARGIN;
      for (const col of colunasEscaladas) {
        const valor = truncar(fonte, linha[col.chave] ?? "", 9, col.largura - 12);
        pagina.drawText(valor, { x: x + 6, y: y - ROW_H + 7, size: 9, font: fonte, color: BLACK });
        x += col.largura;
      }

      pagina.drawLine({
        start: { x: MARGIN, y: y - ROW_H },
        end: { x: MARGIN + larguraTabela * escala, y: y - ROW_H },
        thickness: 0.5,
        color: BORDER,
      });

      y -= ROW_H;
    });

    if (secao.linhas.length === 0) {
      pagina.drawText("Nenhum registro encontrado.", { x: MARGIN + 6, y: y - ROW_H + 7, size: 9, font: fonte, color: TEXT3 });
    }
  }

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}

export type CampoFicha = { label: string; valor: string };
export type SecaoFicha = { titulo: string; campos: CampoFicha[] };

function quebrarLinhas(font: PDFFont, texto: string, tamanho: number, larguraMax: number): string[] {
  const palavras = texto.split(" ");
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (font.widthOfTextAtSize(tentativa, tamanho) > larguraMax && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = tentativa;
    }
  }
  if (atual) linhas.push(atual);
  return linhas.length > 0 ? linhas : [""];
}

/** Ficha em formato retrato, seções de campos label/valor (não tabela) — usada pra imprimir o cadastro completo de um aluno. */
export async function gerarFichaPdf({
  titulo,
  subtitulo,
  secoes,
}: {
  titulo: string;
  subtitulo?: string;
  secoes: SecaoFicha[];
}): Promise<string> {
  const pdf = await PDFDocument.create();
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const PW = 595;
  const PH = 842;
  const LABEL_W = 130;
  const CONTEUDO_MAX = PW - MARGIN * 2 - LABEL_W;
  const geradoEm = new Date().toLocaleString("pt-BR");

  function novaPagina(): PDFPage {
    const pagina = pdf.addPage([PW, PH]);
    pagina.drawRectangle({ x: 0, y: PH - HEADER_H, width: PW, height: HEADER_H, color: NAVY });
    pagina.drawRectangle({ x: 0, y: PH - HEADER_H - 3, width: PW, height: 3, color: YELLOW });
    pagina.drawText("ESCOLA CDA", { x: MARGIN, y: PH - 30, size: 18, font: fonteBold, color: WHITE });
    pagina.drawText("Onde, há 15 anos, família e escola sonham juntas", {
      x: MARGIN,
      y: PH - 46,
      size: 8.5,
      font: fonte,
      color: rgb(0.75, 0.8, 0.9),
    });
    const tituloLargura = fonteBold.widthOfTextAtSize(titulo, 14);
    pagina.drawText(titulo, { x: PW - MARGIN - tituloLargura, y: PH - 28, size: 14, font: fonteBold, color: WHITE });
    const geradoTexto = `Gerado em ${geradoEm}`;
    const geradoLargura = fonte.widthOfTextAtSize(geradoTexto, 8.5);
    pagina.drawText(geradoTexto, {
      x: PW - MARGIN - geradoLargura,
      y: PH - 44,
      size: 8.5,
      font: fonte,
      color: rgb(0.75, 0.8, 0.9),
    });
    return pagina;
  }

  let pagina = novaPagina();
  let y = PH - HEADER_H - 24;

  if (subtitulo) {
    pagina.drawText(subtitulo, { x: MARGIN, y, size: 10, font: fonte, color: TEXT2 });
    y -= 22;
  }

  for (const secao of secoes) {
    if (y < MARGIN + 60) {
      pagina = novaPagina();
      y = PH - HEADER_H - 24;
    }

    pagina.drawText(secao.titulo.toUpperCase(), { x: MARGIN, y, size: 10, font: fonteBold, color: NAVY });
    y -= 6;
    pagina.drawLine({ start: { x: MARGIN, y }, end: { x: PW - MARGIN, y }, thickness: 1, color: BORDER });
    y -= 16;

    for (const campo of secao.campos) {
      const linhasValor = quebrarLinhas(fonte, campo.valor || "—", 9.5, CONTEUDO_MAX);
      const alturaCampo = linhasValor.length * 13 + 6;

      if (y - alturaCampo < MARGIN + 20) {
        pagina = novaPagina();
        y = PH - HEADER_H - 24;
      }

      pagina.drawText(campo.label, { x: MARGIN, y, size: 8.5, font: fonteBold, color: TEXT2 });
      linhasValor.forEach((linha, i) => {
        pagina.drawText(linha, { x: MARGIN + LABEL_W, y: y - i * 13, size: 9.5, font: fonte, color: BLACK });
      });
      y -= alturaCampo;
    }

    y -= 10;
  }

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}

export function respostaPDF(dataUri: string, nomeArquivo: string): Response {
  const base64 = dataUri.split(",")[1] ?? dataUri;
  const bytes = Buffer.from(base64, "base64");
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}
