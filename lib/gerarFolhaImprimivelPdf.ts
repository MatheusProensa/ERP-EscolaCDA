import { PDFDocument, StandardFonts } from "pdf-lib";
import { embarcarLogo, desenharLogo, desenharSlogan, NAVY, YELLOW, TEXT2, BLACK, WHITE } from "./gerarRelatorioPdf";

const LARGURA = 595;
const ALTURA = 842; // A4 retrato — folha pra imprimir e preencher à mão, não tabela
const MARGEM = 48;
const HEADER_H = 70;

export type TipoFolhaImprimivel = "TEMA_LITERARIO" | "ATIVIDADE_GRAFICA";

const TITULO: Record<TipoFolhaImprimivel, string> = {
  TEMA_LITERARIO: "Tema Literário",
  ATIVIDADE_GRAFICA: "Atividade Gráfica",
};

/** Folha imprimível pontual (achado real, set/2026: documentos
 * MODELO_TEMA_LITERÁRIO/ATIVIDADE_GRÁFICA_CDA) — cabeçalho NOME/DATA em
 * branco pra criança preencher, o texto da instrução (escrito pela
 * professora naquele dia específico do planejamento) e um espaço grande em
 * branco pro desenho. Uma folha por vez (não é lista de alunos — é o mesmo
 * impresso repetido N vezes na hora de tirar cópia). */
export async function gerarFolhaImprimivelPdf({
  tipo,
  turmaNome,
  texto,
}: {
  tipo: TipoFolhaImprimivel;
  turmaNome: string;
  texto: string;
}): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${TITULO[tipo]} — ${turmaNome} — Escola CDA`);
  pdf.setAuthor("Escola CDA");
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embarcarLogo(pdf);

  const pagina = pdf.addPage([LARGURA, ALTURA]);

  pagina.drawRectangle({ x: 0, y: ALTURA - HEADER_H, width: LARGURA, height: HEADER_H, color: NAVY });
  pagina.drawRectangle({ x: 0, y: ALTURA - HEADER_H - 3, width: LARGURA, height: 3, color: YELLOW });
  desenharLogo(pagina, logo, ALTURA);
  desenharSlogan(pagina, fonte, ALTURA);
  const turmaLargura = fonteBold.widthOfTextAtSize(turmaNome, 12);
  pagina.drawText(turmaNome, { x: LARGURA - MARGEM - turmaLargura, y: ALTURA - 32, size: 12, font: fonteBold, color: WHITE });

  let y = ALTURA - HEADER_H - 40;

  // Linha NOME/DATA pra criança preencher à mão
  pagina.drawText("NOME:", { x: MARGEM, y, size: 10, font: fonteBold, color: BLACK });
  pagina.drawLine({ start: { x: MARGEM + 42, y: y - 2 }, end: { x: LARGURA - MARGEM - 110, y: y - 2 }, thickness: 0.8, color: TEXT2 });
  pagina.drawText("DATA:", { x: LARGURA - MARGEM - 95, y, size: 10, font: fonteBold, color: BLACK });
  pagina.drawLine({ start: { x: LARGURA - MARGEM - 55, y: y - 2 }, end: { x: LARGURA - MARGEM, y: y - 2 }, thickness: 0.8, color: TEXT2 });
  y -= 40;

  const tituloTexto = TITULO[tipo].toUpperCase();
  const tituloLargura = fonteBold.widthOfTextAtSize(tituloTexto, 18);
  pagina.drawText(tituloTexto, { x: (LARGURA - tituloLargura) / 2, y, size: 18, font: fonteBold, color: NAVY });
  y -= 34;

  function quebrarLinhas(txt: string, tamanho: number, larguraMax: number): string[] {
    const palavras = txt.replace(/[\r\n]+/g, " ").split(" ");
    const linhas: string[] = [];
    let atual = "";
    for (const palavra of palavras) {
      const teste = atual ? `${atual} ${palavra}` : palavra;
      if (fonte.widthOfTextAtSize(teste, tamanho) > larguraMax && atual) {
        linhas.push(atual);
        atual = palavra;
      } else {
        atual = teste;
      }
    }
    if (atual) linhas.push(atual);
    return linhas;
  }

  const larguraUtil = LARGURA - MARGEM * 2;
  for (const linha of quebrarLinhas(texto, 11, larguraUtil)) {
    pagina.drawText(linha, { x: MARGEM, y, size: 11, font: fonte, color: BLACK });
    y -= 16;
  }
  y -= 20;

  // Espaço em branco pro desenho — ocupa o resto da página, com borda leve
  // só pra delimitar a área (achado real: a criança desenha livre ali dentro).
  const rodape = 40;
  pagina.drawRectangle({
    x: MARGEM,
    y: rodape,
    width: larguraUtil,
    height: y - rodape,
    borderColor: TEXT2,
    borderWidth: 0.8,
  });

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}
