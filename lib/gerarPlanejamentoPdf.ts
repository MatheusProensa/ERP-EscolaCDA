import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { embarcarLogo, desenharLogo, desenharSlogan, NAVY, YELLOW, TEXT2, TEXT3, BLACK, WHITE } from "./gerarRelatorioPdf";

const LARGURA = 595;
const ALTURA = 842; // A4 retrato
const MARGEM = 48;
const HEADER_H = 70;
const RODAPE = 40;
const LARGURA_UTIL = LARGURA - MARGEM * 2;

export type DiaPlanejamentoPdf = {
  label: string;
  tipoLabel: string;
  blocos: { label: string; texto: string }[];
  especializadas: string;
};

/** PDF do planejamento semanal — mesma estrutura do documento real
 * MODELO_PLANEJAMENTO_CDA (achado real, set/2026), com o cabeçalho de marca
 * já usado no resto do sistema. Multi-página (quebra sozinho quando o
 * conteúdo de um dia não cabe), diferente da folha imprimível (1 página fixa)
 * porque aqui o texto é de altura bem variável — pode ter 1 linha ou 15. */
export async function gerarPlanejamentoPdf({
  turmaNome,
  semanaLabel,
  projetoNome,
  materiais,
  dias,
}: {
  turmaNome: string;
  semanaLabel: string;
  projetoNome: string | null;
  materiais: string | null;
  dias: DiaPlanejamentoPdf[];
}): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Planejamento — ${turmaNome} — ${semanaLabel} — Escola CDA`);
  pdf.setAuthor("Escola CDA");
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embarcarLogo(pdf);

  function desenharCabecalho(pagina: PDFPage) {
    pagina.drawRectangle({ x: 0, y: ALTURA - HEADER_H, width: LARGURA, height: HEADER_H, color: NAVY });
    pagina.drawRectangle({ x: 0, y: ALTURA - HEADER_H - 3, width: LARGURA, height: 3, color: YELLOW });
    desenharLogo(pagina, logo, ALTURA);
    desenharSlogan(pagina, fonte, ALTURA);

    const turmaLargura = fonteBold.widthOfTextAtSize(turmaNome, 12);
    pagina.drawText(turmaNome, { x: LARGURA - MARGEM - turmaLargura, y: ALTURA - 28, size: 12, font: fonteBold, color: WHITE });
    const semanaLargura = fonte.widthOfTextAtSize(semanaLabel, 9);
    pagina.drawText(semanaLabel, {
      x: LARGURA - MARGEM - semanaLargura,
      y: ALTURA - 44,
      size: 9,
      font: fonte,
      color: rgb(0.75, 0.8, 0.9),
    });
  }

  let pagina = pdf.addPage([LARGURA, ALTURA]);
  desenharCabecalho(pagina);
  let y = ALTURA - HEADER_H - 30;

  function novaPagina() {
    pagina = pdf.addPage([LARGURA, ALTURA]);
    desenharCabecalho(pagina);
    y = ALTURA - HEADER_H - 30;
  }

  function garantirEspaco(altura: number) {
    if (y - altura < RODAPE) novaPagina();
  }

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

  function escreverParagrafo(texto: string, tamanho: number, fnt: PDFFont, cor = BLACK) {
    for (const linha of quebrarLinhas(fnt, texto, tamanho, LARGURA_UTIL)) {
      garantirEspaco(tamanho + 4);
      pagina.drawText(linha, { x: MARGEM, y, size: tamanho, font: fnt, color: cor });
      y -= tamanho + 4;
    }
  }

  if (projetoNome) {
    garantirEspaco(16);
    pagina.drawText(`Projeto: ${projetoNome}`, { x: MARGEM, y, size: 10, font: fonteBold, color: NAVY });
    y -= 18;
  }
  if (materiais) {
    garantirEspaco(13);
    pagina.drawText("Materiais da semana:", { x: MARGEM, y, size: 9, font: fonteBold, color: TEXT2 });
    y -= 12;
    escreverParagrafo(materiais, 9, fonte, TEXT2);
    y -= 8;
  }

  for (const dia of dias) {
    garantirEspaco(28);
    pagina.drawLine({ start: { x: MARGEM, y: y + 8 }, end: { x: MARGEM + LARGURA_UTIL, y: y + 8 }, thickness: 0.8, color: NAVY });
    pagina.drawText(dia.label, { x: MARGEM, y, size: 12, font: fonteBold, color: NAVY });
    const tipoLargura = fonte.widthOfTextAtSize(dia.tipoLabel, 8.5);
    pagina.drawText(dia.tipoLabel, { x: LARGURA - MARGEM - tipoLargura, y: y + 1.5, size: 8.5, font: fonte, color: TEXT3 });
    y -= 18;

    if (dia.blocos.length === 0) {
      garantirEspaco(13);
      pagina.drawText("— Sem conteúdo preenchido —", { x: MARGEM, y, size: 9, font: fonte, color: TEXT3 });
      y -= 16;
    }
    for (const bloco of dia.blocos) {
      garantirEspaco(13);
      pagina.drawText(`${bloco.label}:`, { x: MARGEM, y, size: 9.5, font: fonteBold, color: BLACK });
      y -= 13;
      escreverParagrafo(bloco.texto, 9.5, fonte);
      y -= 4;
    }
    if (dia.especializadas) {
      garantirEspaco(12);
      pagina.drawText("Especializadas:", { x: MARGEM, y, size: 9, font: fonteBold, color: TEXT2 });
      y -= 12;
      escreverParagrafo(dia.especializadas, 9, fonte, TEXT2);
    }
    y -= 10;
  }

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}
