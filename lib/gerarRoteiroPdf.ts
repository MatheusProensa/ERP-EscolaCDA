import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";

const LARGURA = 842;
const ALTURA = 595; // A4 paisagem — precisa da largura pra caber os 5 dias lado a lado
const MARGEM = 30;
const LARGURA_UTIL = LARGURA - MARGEM * 2;
const NUM_COLUNAS = 5;
const LARGURA_COLUNA = LARGURA_UTIL / NUM_COLUNAS;
const PADDING_CELULA = 5;
const ALTURA_LINHA = 10.5;
const ALTURA_CABECALHO_DIA = 26;
const PRETO = rgb(0, 0, 0);
const CINZA = rgb(0.35, 0.35, 0.35);

export type RoteiroDiaPdf = {
  diaLabel: string; // "SEGUNDA-FEIRA — 01/09"
  tematica: string;
  vivencias: string[];
  especializadas: string;
};

export type RoteiroSemanaPdf = {
  semanaLabel: string;
  materiais: string | null;
  dias: RoteiroDiaPdf[]; // sempre 5 (segunda a sexta)
};

/** PDF do Roteiro de Vivências Pedagógicas — tabela HORIZONTAL com os 5 dias
 * em colunas (achado real, set/2026, documento MODELO_ROTEIRO_CDA: "SEGUNDA
 * / TERÇA / QUARTA / QUINTA / SEXTA" lado a lado, cada célula com Temática +
 * Vivências + Especializadas). É o resumo em bullets do Planejamento (não
 * digitado de novo, gerado a partir dele — ver bulletsDoDia). Uma tabela por
 * semana, o mês inteiro num arquivo só (mesmo padrão do PDF do Planejamento).
 * Sem logo, sem cor — folha simples preto e branco (pedido do dono, set/2026:
 * fidelidade aos 4 documentos reais, que são todos assim). */
export async function gerarRoteiroMesPdf({
  turmaNome,
  professoraNome,
  mesLabel,
  projetoNome,
  projetoJustificativa,
  semanas,
}: {
  turmaNome: string;
  professoraNome: string;
  mesLabel: string;
  projetoNome: string | null;
  projetoJustificativa: string | null;
  semanas: RoteiroSemanaPdf[];
}): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Roteiro de Vivências — ${turmaNome} — ${mesLabel} — Escola CDA`);
  pdf.setAuthor("Escola CDA");
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteBold = await pdf.embedFont(StandardFonts.HelveticaBold);

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

  function desenharCabecalho(pagina: PDFPage): number {
    let y = ALTURA - MARGEM;
    pagina.drawText("ROTEIRO DE VIVÊNCIAS PEDAGÓGICAS", { x: MARGEM, y, size: 13, font: fonteBold, color: PRETO });
    y -= 16;
    pagina.drawText(`Turma: ${turmaNome}`, { x: MARGEM, y, size: 9, font: fonte, color: PRETO });
    pagina.drawText(`Professora: ${professoraNome || "—"}`, { x: MARGEM + 220, y, size: 9, font: fonte, color: PRETO });
    pagina.drawText(`Período: ${mesLabel}`, { x: MARGEM + 440, y, size: 9, font: fonte, color: PRETO });
    y -= 14;
    if (projetoNome) {
      pagina.drawText(`Tema do Projeto: ${projetoNome}`, { x: MARGEM, y, size: 9, font: fonteBold, color: PRETO });
      y -= 12;
    }
    if (projetoJustificativa) {
      const linhas = quebrarLinhas(fonte, `Justificativa: ${projetoJustificativa}`, 8.5, LARGURA_UTIL);
      for (const linha of linhas) {
        pagina.drawText(linha, { x: MARGEM, y, size: 8.5, font: fonte, color: CINZA });
        y -= 11;
      }
    }
    y -= 6;
    pagina.drawLine({ start: { x: MARGEM, y }, end: { x: LARGURA - MARGEM, y }, thickness: 1, color: PRETO });
    return y - 14;
  }

  // Monta, pra cada dia, a lista de linhas (com marcação de negrito) que vão
  // dentro da célula — largura já descontando o padding interno.
  function montarLinhasCelula(dia: RoteiroDiaPdf): { texto: string; negrito: boolean }[] {
    const larguraCel = LARGURA_COLUNA - PADDING_CELULA * 2;
    const linhas: { texto: string; negrito: boolean }[] = [];
    if (dia.tematica) {
      linhas.push({ texto: "Temática:", negrito: true });
      for (const l of quebrarLinhas(fonte, dia.tematica, 8.5, larguraCel)) linhas.push({ texto: l, negrito: false });
    }
    if (dia.vivencias.length > 0) {
      linhas.push({ texto: "Vivências:", negrito: true });
      for (const v of dia.vivencias) {
        for (const l of quebrarLinhas(fonte, `• ${v}`, 8.5, larguraCel)) linhas.push({ texto: l, negrito: false });
      }
    }
    if (dia.especializadas) {
      linhas.push({ texto: "Especializadas:", negrito: true });
      for (const l of quebrarLinhas(fonte, dia.especializadas, 8.5, larguraCel)) linhas.push({ texto: l, negrito: false });
    }
    if (linhas.length === 0) linhas.push({ texto: "— Sem conteúdo preenchido —", negrito: false });
    return linhas;
  }

  semanas.forEach((semana) => {
    const pagina = pdf.addPage([LARGURA, ALTURA]);
    let y = desenharCabecalho(pagina);

    pagina.drawText(semana.semanaLabel.toUpperCase(), { x: MARGEM, y, size: 11, font: fonteBold, color: PRETO });
    y -= 18;

    const linhasPorDia = semana.dias.map(montarLinhasCelula);
    const maxLinhas = Math.max(...linhasPorDia.map((l) => l.length));
    const alturaConteudo = maxLinhas * ALTURA_LINHA + PADDING_CELULA * 2;
    const alturaTabela = ALTURA_CABECALHO_DIA + alturaConteudo;

    const topoTabela = y;
    const baseTabela = topoTabela - alturaTabela;

    // Bordas verticais (6 linhas pra 5 colunas) + horizontais (topo, meio, base)
    for (let c = 0; c <= NUM_COLUNAS; c++) {
      const x = MARGEM + c * LARGURA_COLUNA;
      pagina.drawLine({ start: { x, y: topoTabela }, end: { x, y: baseTabela }, thickness: 0.7, color: PRETO });
    }
    pagina.drawLine({ start: { x: MARGEM, y: topoTabela }, end: { x: LARGURA - MARGEM, y: topoTabela }, thickness: 0.7, color: PRETO });
    pagina.drawLine({
      start: { x: MARGEM, y: topoTabela - ALTURA_CABECALHO_DIA },
      end: { x: LARGURA - MARGEM, y: topoTabela - ALTURA_CABECALHO_DIA },
      thickness: 0.7,
      color: PRETO,
    });
    pagina.drawLine({ start: { x: MARGEM, y: baseTabela }, end: { x: LARGURA - MARGEM, y: baseTabela }, thickness: 0.7, color: PRETO });

    semana.dias.forEach((dia, c) => {
      const xCel = MARGEM + c * LARGURA_COLUNA;
      // Cabeçalho do dia, centralizado na coluna
      const partes = dia.diaLabel.split(" — ");
      const linha1 = partes[0] ?? dia.diaLabel;
      const linha2 = partes[1] ?? "";
      const l1Largura = fonteBold.widthOfTextAtSize(linha1, 9);
      pagina.drawText(linha1, { x: xCel + (LARGURA_COLUNA - l1Largura) / 2, y: topoTabela - 12, size: 9, font: fonteBold, color: PRETO });
      if (linha2) {
        const l2Largura = fonte.widthOfTextAtSize(linha2, 8);
        pagina.drawText(linha2, { x: xCel + (LARGURA_COLUNA - l2Largura) / 2, y: topoTabela - 23, size: 8, font: fonte, color: CINZA });
      }

      // Conteúdo da célula
      let yCel = topoTabela - ALTURA_CABECALHO_DIA - PADDING_CELULA - 8;
      for (const linha of linhasPorDia[c]) {
        pagina.drawText(linha.texto, {
          x: xCel + PADDING_CELULA,
          y: yCel,
          size: 8.5,
          font: linha.negrito ? fonteBold : fonte,
          color: PRETO,
        });
        yCel -= ALTURA_LINHA;
      }
    });

    let yApos = baseTabela - 16;
    if (semana.materiais) {
      pagina.drawText("MATERIAIS:", { x: MARGEM, y: yApos, size: 9, font: fonteBold, color: PRETO });
      yApos -= 12;
      for (const l of quebrarLinhas(fonte, semana.materiais, 9, LARGURA_UTIL)) {
        pagina.drawText(l, { x: MARGEM, y: yApos, size: 9, font: fonte, color: PRETO });
        yApos -= 12;
      }
    }
  });

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}
