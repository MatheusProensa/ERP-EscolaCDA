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
      pagina.drawText(col.label.toUpperCase(), {
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
