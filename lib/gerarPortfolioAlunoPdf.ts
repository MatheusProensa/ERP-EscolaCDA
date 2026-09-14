import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { embarcarLogo, desenharLogo, desenharSlogan, NAVY, YELLOW, TEXT2, TEXT3, WHITE } from "./gerarRelatorioPdf";

const LARGURA = 595;
const ALTURA = 842; // A4 retrato
const MARGEM = 48;
const HEADER_H = 70;
const RODAPE = 40;
const LARGURA_UTIL = LARGURA - MARGEM * 2;

export type ItemPortfolioPdf = {
  /** Data URI completo ("data:image/jpeg;base64,...") — mesmo formato salvo
   * no banco (PortfolioItem.foto), só JPEG (achado real: FotoPortfolioUpload
   * já converte qualquer imagem pra JPEG antes de salvar). */
  fotoDataUri: string;
  legenda: string | null;
  data: string; // ISO
};

/** Exporta o portfólio inteiro de 1 aluno em PDF — pedido do dono, set/2026:
 * "no fim do ano, exportar tudo do aluno em PDF, produto final pra entregar
 * pra família". 1 foto por página (ordem cronológica), com legenda e data —
 * é um álbum pra entregar, não documento de trabalho, então mantém o
 * padrão visual de marca do resto do sistema (logo/cor), diferente dos 4
 * documentos do Word (esses continuam preto e branco). */
export async function gerarPortfolioAlunoPdf({
  alunoNome,
  turmaNome,
  itens,
}: {
  alunoNome: string;
  turmaNome: string;
  itens: ItemPortfolioPdf[];
}): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Portfólio — ${alunoNome} — Escola CDA`);
  pdf.setAuthor("Escola CDA");
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embarcarLogo(pdf);

  function desenharCabecalho(pagina: PDFPage) {
    pagina.drawRectangle({ x: 0, y: ALTURA - HEADER_H, width: LARGURA, height: HEADER_H, color: NAVY });
    pagina.drawRectangle({ x: 0, y: ALTURA - HEADER_H - 3, width: LARGURA, height: 3, color: YELLOW });
    desenharLogo(pagina, logo, ALTURA);
    desenharSlogan(pagina, fonte, ALTURA);
    // Nome/turma à direita, mesmo padrão dos outros geradores com logo (ver
    // gerarFolhaImprimivelPdf.ts) — evita colidir com o logo/slogan à esquerda.
    const nomeLargura = fonteBold.widthOfTextAtSize(alunoNome, 12);
    pagina.drawText(alunoNome, { x: LARGURA - MARGEM - nomeLargura, y: ALTURA - 28, size: 12, font: fonteBold, color: WHITE });
    const turmaTexto = `Portfólio — ${turmaNome}`;
    const turmaLargura = fonte.widthOfTextAtSize(turmaTexto, 9);
    pagina.drawText(turmaTexto, {
      x: LARGURA - MARGEM - turmaLargura,
      y: ALTURA - 44,
      size: 9,
      font: fonte,
      color: rgb(0.75, 0.8, 0.9),
    });
  }

  // Capa — só o cabeçalho + contagem, dá o tom do documento antes das fotos.
  const capa = pdf.addPage([LARGURA, ALTURA]);
  desenharCabecalho(capa);
  capa.drawText(`${itens.length} registro${itens.length === 1 ? "" : "s"} de portfólio`, {
    x: MARGEM,
    y: ALTURA - HEADER_H - 40,
    size: 11,
    font: fonte,
    color: TEXT2,
  });

  function quebrarLinhas(fnt: PDFFont, texto: string, tamanho: number, larguraMax: number): string[] {
    const palavras = texto.replace(/[\r\n]+/g, " ").split(" ");
    const linhas: string[] = [];
    let atual = "";
    for (const palavra of palavras) {
      const teste = atual ? `${atual} ${palavra}` : palavra;
      if (fnt.widthOfTextAtSize(teste, tamanho) > larguraMax && atual) {
        linhas.push(atual);
        atual = palavra;
      } else {
        atual = teste;
      }
    }
    if (atual) linhas.push(atual);
    return linhas;
  }

  for (const item of itens) {
    const pagina = pdf.addPage([LARGURA, ALTURA]);
    desenharCabecalho(pagina);

    const base64 = item.fotoDataUri.split(",")[1] ?? item.fotoDataUri;
    const bytes = Buffer.from(base64, "base64");
    let y = ALTURA - HEADER_H - 24;
    try {
      const imagem = await pdf.embedJpg(bytes);
      // Cabe numa caixa fixa mantendo proporção — nem estica, nem estoura a página.
      const alturaMaxima = ALTURA - HEADER_H - RODAPE - 90;
      const escala = Math.min(LARGURA_UTIL / imagem.width, alturaMaxima / imagem.height, 1);
      const larguraFinal = imagem.width * escala;
      const alturaFinal = imagem.height * escala;
      const x = MARGEM + (LARGURA_UTIL - larguraFinal) / 2;
      pagina.drawImage(imagem, { x, y: y - alturaFinal, width: larguraFinal, height: alturaFinal });
      y -= alturaFinal + 20;
    } catch {
      pagina.drawText("— Não foi possível carregar essa foto —", { x: MARGEM, y, size: 10, font: fonte, color: TEXT3 });
      y -= 24;
    }

    const dataLabel = new Date(`${item.data.slice(0, 10)}T00:00:00.000Z`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    });
    pagina.drawText(dataLabel, { x: MARGEM, y, size: 9, font: fonteBold, color: TEXT2 });
    y -= 16;
    if (item.legenda) {
      for (const linha of quebrarLinhas(fonte, item.legenda, 10, LARGURA_UTIL)) {
        pagina.drawText(linha, { x: MARGEM, y, size: 10, font: fonte, color: TEXT2 });
        y -= 14;
      }
    }
  }

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}
