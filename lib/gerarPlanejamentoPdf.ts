import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";

const LARGURA = 595;
const ALTURA = 842; // A4 retrato
const MARGEM = 48;
const HEADER_H = 56;
const RODAPE = 40;
const LARGURA_UTIL = LARGURA - MARGEM * 2;
const PRETO = rgb(0, 0, 0);
const CINZA = rgb(0.35, 0.35, 0.35);
const LINHA = rgb(0, 0, 0);

export type DiaPlanejamentoPdf = {
  label: string;
  tipoLabel: string;
  blocos: { label: string; texto: string }[];
  especializadas: string;
};

export type SemanaPlanejamentoPdf = {
  semanaLabel: string;
  projetoNome: string | null;
  projetoJustificativa: string | null;
  materiais: string | null;
  tardeCulturalApresentacao: string | null;
  tardeCulturalMateriais: string | null;
  dias: DiaPlanejamentoPdf[];
};

export type MomentoRotinaPdf = { nome: string; descricao: string };

/** PDF do planejamento do MÊS INTEIRO — mesma estrutura do documento real
 * MODELO_PLANEJAMENTO_CDA (achado real, set/2026: organizado por mês, com as
 * semanas dentro). Folha simples pra imprimir em quantidade — sem logo, sem
 * cor de fundo, só texto preto em fundo branco (pedido do dono, set/2026:
 * "na área pedagógica quero fielmente aos arquivos que te mandei", os 4 docs
 * reais da escola são todos preto e branco). A professora continua
 * preenchendo semana a semana na tela; o PDF é que junta tudo. Cada semana
 * começa em página nova; dentro de cada semana, quebra de página automática. */
export async function gerarPlanejamentoMesPdf({
  turmaNome,
  professoraNome,
  mesLabel,
  rotina,
  semanas,
}: {
  turmaNome: string;
  professoraNome: string;
  mesLabel: string;
  rotina?: MomentoRotinaPdf[];
  semanas: SemanaPlanejamentoPdf[];
}): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Planejamento — ${turmaNome} — ${mesLabel} — Escola CDA`);
  pdf.setAuthor("Escola CDA");
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  function desenharCabecalho(pagina: PDFPage) {
    let yCab = ALTURA - MARGEM + 8;
    pagina.drawText("PLANEJAMENTO PEDAGÓGICO", { x: MARGEM, y: yCab, size: 14, font: fonteBold, color: PRETO });
    yCab -= 18;
    pagina.drawText(`Turma: ${turmaNome}`, { x: MARGEM, y: yCab, size: 9.5, font: fonte, color: PRETO });
    pagina.drawText(`Professora: ${professoraNome || "—"}`, { x: MARGEM + 220, y: yCab, size: 9.5, font: fonte, color: PRETO });
    yCab -= 13;
    pagina.drawText(`Período: ${mesLabel}`, { x: MARGEM, y: yCab, size: 9.5, font: fonte, color: PRETO });
    yCab -= 10;
    pagina.drawLine({ start: { x: MARGEM, y: yCab }, end: { x: LARGURA - MARGEM, y: yCab }, thickness: 1, color: LINHA });
  }

  let pagina = pdf.addPage([LARGURA, ALTURA]);
  desenharCabecalho(pagina);
  let y = ALTURA - MARGEM - HEADER_H;

  function novaPagina() {
    pagina = pdf.addPage([LARGURA, ALTURA]);
    desenharCabecalho(pagina);
    y = ALTURA - MARGEM - HEADER_H;
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

  function escreverParagrafo(texto: string, tamanho: number, fnt: PDFFont, cor = PRETO) {
    for (const linha of quebrarLinhas(fnt, texto, tamanho, LARGURA_UTIL)) {
      garantirEspaco(tamanho + 4);
      pagina.drawText(linha, { x: MARGEM, y, size: tamanho, font: fnt, color: cor });
      y -= tamanho + 4;
    }
  }

  // Planejamento do Cotidiano (rotina fixa da turma) — achado real, set/2026:
  // aparece 1 vez no documento, não repete por semana. Entra antes da
  // primeira semana, só quando a turma tem rotina cadastrada.
  if (rotina && rotina.length > 0) {
    pagina.drawText("PLANEJAMENTO DO COTIDIANO", { x: MARGEM, y, size: 12, font: fonteBold, color: PRETO });
    y -= 18;
    for (const momento of rotina) {
      garantirEspaco(13);
      pagina.drawText(momento.nome, { x: MARGEM, y, size: 9.5, font: fonteBold, color: PRETO });
      y -= 13;
      if (momento.descricao) {
        escreverParagrafo(momento.descricao, 9.5, fonte, CINZA);
      }
      y -= 6;
    }
    y -= 6;
  }

  semanas.forEach((semana, indiceSemana) => {
    // Cada semana começa em página nova (menos a primeira, que já abre a
    // página inicial do documento, ou a página da rotina quando tem) — fica
    // claro no impresso onde uma semana termina e a próxima começa dentro do
    // mês.
    if (indiceSemana > 0) novaPagina();

    pagina.drawText(semana.semanaLabel.toUpperCase(), { x: MARGEM, y, size: 12, font: fonteBold, color: PRETO });
    y -= 18;

    if (semana.projetoNome) {
      garantirEspaco(15);
      pagina.drawText(`Nome do Projeto: ${semana.projetoNome}`, { x: MARGEM, y, size: 9.5, font: fonteBold, color: PRETO });
      y -= 16;
    }
    if (semana.projetoJustificativa) {
      garantirEspaco(13);
      pagina.drawText("Justificativa:", { x: MARGEM, y, size: 9, font: fonteBold, color: PRETO });
      y -= 12;
      escreverParagrafo(semana.projetoJustificativa, 9, fonte, CINZA);
      y -= 8;
    }

    for (const dia of semana.dias) {
      garantirEspaco(26);
      pagina.drawLine({ start: { x: MARGEM, y: y + 8 }, end: { x: MARGEM + LARGURA_UTIL, y: y + 8 }, thickness: 0.6, color: LINHA });
      pagina.drawText(dia.label, { x: MARGEM, y, size: 11, font: fonteBold, color: PRETO });
      const tipoLargura = fonte.widthOfTextAtSize(dia.tipoLabel, 8.5);
      pagina.drawText(dia.tipoLabel, { x: LARGURA - MARGEM - tipoLargura, y: y + 1.5, size: 8.5, font: fonte, color: CINZA });
      y -= 17;

      if (dia.blocos.length === 0) {
        garantirEspaco(13);
        pagina.drawText("— Sem conteúdo preenchido —", { x: MARGEM, y, size: 9, font: fonte, color: CINZA });
        y -= 16;
      }
      for (const bloco of dia.blocos) {
        garantirEspaco(13);
        pagina.drawText(`${bloco.label.toUpperCase()}:`, { x: MARGEM, y, size: 9, font: fonteBold, color: PRETO });
        y -= 12;
        escreverParagrafo(bloco.texto, 9.5, fonte);
        y -= 4;
      }
      if (dia.especializadas) {
        garantirEspaco(12);
        pagina.drawText("Especializadas:", { x: MARGEM, y, size: 9, font: fonteBold, color: PRETO });
        y -= 12;
        escreverParagrafo(dia.especializadas, 9, fonte, CINZA);
      }
      y -= 10;
    }

    if (semana.materiais) {
      garantirEspaco(13);
      pagina.drawText("LISTA DE MATERIAIS NECESSÁRIOS:", { x: MARGEM, y, size: 9, font: fonteBold, color: PRETO });
      y -= 12;
      escreverParagrafo(semana.materiais, 9, fonte);
      y -= 8;
    }

    // Tarde Cultural (achado real, set/2026: bloco separado com quebra de
    // página própria, "porém no mesmo arquivo" — a lista de materiais é
    // entregue pra prof que separa o material depois de imprimir). Só entra
    // quando a semana tem algo.
    if (semana.tardeCulturalApresentacao || semana.tardeCulturalMateriais) {
      novaPagina();
      pagina.drawText("OBS: EM CASO DE TARDE CULTURAL", { x: MARGEM, y, size: 12, font: fonteBold, color: PRETO });
      y -= 18;
      if (semana.tardeCulturalApresentacao) {
        garantirEspaco(13);
        pagina.drawText("Apresentação da turma:", { x: MARGEM, y, size: 9.5, font: fonteBold, color: PRETO });
        y -= 13;
        escreverParagrafo(semana.tardeCulturalApresentacao, 9.5, fonte);
        y -= 8;
      }
      if (semana.tardeCulturalMateriais) {
        garantirEspaco(13);
        pagina.drawText("Lista de materiais necessários:", { x: MARGEM, y, size: 9.5, font: fonteBold, color: PRETO });
        y -= 13;
        escreverParagrafo(semana.tardeCulturalMateriais, 9.5, fonte);
      }
    }
  });

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}
