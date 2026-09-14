import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const LARGURA = 595;
const ALTURA = 842; // A4 retrato — folha pra imprimir e preencher à mão, não tabela
const MARGEM = 48;
const PRETO = rgb(0, 0, 0);
const CINZA = rgb(0.35, 0.35, 0.35);

export type TipoFolhaImprimivel = "TEMA_LITERARIO" | "ATIVIDADE_GRAFICA";

const TITULO: Record<TipoFolhaImprimivel, string> = {
  TEMA_LITERARIO: "Tema Literário",
  ATIVIDADE_GRAFICA: "Atividade Gráfica",
};

/** Folha imprimível (achado real, set/2026: documentos
 * MODELO_TEMA_LITERÁRIO/ATIVIDADE_GRÁFICA_CDA) — cabeçalho "NOME: ___ DATA:
 * ___", título, o texto da instrução (escrito pela professora naquele dia
 * específico do planejamento) e um espaço grande em branco pro desenho. Sem
 * logo, sem cor — folha simples preto e branco pra imprimir em quantidade
 * (pedido do dono, set/2026: "na área pedagógica quero fielmente aos
 * arquivos que te mandei", os 4 docs reais da escola são todos assim).
 *
 * `alunos` é a lista de nomes da turma — gera 1 página por aluno, com o
 * nome já preenchido na linha (puxado da matrícula, acaba com a professora
 * escrevendo 20x o mesmo cabeçalho à mão). Lista vazia gera 1 página em
 * branco (cópia mestra, pra imprimir manualmente quando não há turma
 * associada). A data vem de fora, é a mesma pra turma inteira nesse dia. */
export async function gerarFolhaImprimivelPdf({
  tipo,
  turmaNome,
  texto,
  dataLabel,
  alunos,
}: {
  tipo: TipoFolhaImprimivel;
  turmaNome: string;
  texto: string;
  dataLabel: string;
  alunos: string[];
}): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${TITULO[tipo]} — ${turmaNome} — Escola CDA`);
  pdf.setAuthor("Escola CDA");
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const larguraUtil = LARGURA - MARGEM * 2;

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

  const listaAlunos = alunos.length > 0 ? alunos : [""];

  for (const nomeAluno of listaAlunos) {
    const pagina = pdf.addPage([LARGURA, ALTURA]);
    let y = ALTURA - MARGEM;

    // Cabeçalho igual ao modelo: "NOME: ___ DATA: xx/xx/xxxx"
    pagina.drawText("NOME:", { x: MARGEM, y, size: 10, font: fonteBold, color: PRETO });
    if (nomeAluno) {
      pagina.drawText(nomeAluno, { x: MARGEM + 42, y, size: 10, font: fonte, color: PRETO });
    }
    pagina.drawLine({ start: { x: MARGEM + 42, y: y - 2 }, end: { x: LARGURA - MARGEM - 110, y: y - 2 }, thickness: 0.8, color: PRETO });
    pagina.drawText("DATA:", { x: LARGURA - MARGEM - 95, y, size: 10, font: fonteBold, color: PRETO });
    pagina.drawText(dataLabel, { x: LARGURA - MARGEM - 55, y, size: 10, font: fonte, color: PRETO });
    y -= 40;

    const tituloTexto = TITULO[tipo].toUpperCase();
    const tituloLargura = fonteBold.widthOfTextAtSize(tituloTexto, 16);
    pagina.drawText(tituloTexto, { x: (LARGURA - tituloLargura) / 2, y, size: 16, font: fonteBold, color: PRETO });
    y -= 30;

    for (const linha of quebrarLinhas(texto, 11, larguraUtil)) {
      pagina.drawText(linha, { x: MARGEM, y, size: 11, font: fonte, color: PRETO });
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
      borderColor: CINZA,
      borderWidth: 0.8,
    });
  }

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}
