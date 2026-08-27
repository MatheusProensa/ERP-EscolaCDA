import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFPage, type PDFFont } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";

/**
 * Avaliação Escrita — Processo Seletivo (cargo Monitora), recriada com o
 * timbrado da própria escola a partir do modelo que a escola já usa. Também é
 * documento estático pra imprimir e preencher à mão (fica em Documentos
 * institucionais, categoria RH) — mesmo tratamento da Ficha de Admissão.
 */

const CINZA = rgb(0x5a / 255, 0x6a / 255, 0x85 / 255);
const PRETO = rgb(0, 0, 0);
const AZUL_BORDA = rgb(0x00 / 255, 0xaf / 255, 0xef / 255);

const LARGURA = 595;
const ALTURA = 842;
const MARGEM = 54;
const TOPO_CONTEUDO = ALTURA - 125;
const RODAPE = 45;
const LARGURA_UTIL = LARGURA - MARGEM * 2;

const PERGUNTAS = [
  {
    titulo: "Apresentação",
    texto: "Conte um pouco sobre você, sua trajetória profissional e por que deseja trabalhar como monitora na Escola CDA.",
  },
  {
    titulo: "Trabalhando com crianças",
    texto: "O que você considera mais importante ao cuidar de crianças durante o período em que estão na escola?",
  },
  {
    titulo: "Situação prática",
    texto: "Uma criança começa a chorar porque sente saudade da família. Como você agiria?",
  },
  {
    titulo: "Organização e responsabilidade",
    texto: "Na sua opinião, quais são as principais responsabilidades de uma monitora dentro da escola?",
  },
  {
    titulo: "Trabalho em equipe",
    texto:
      "Como você lida com orientações da coordenação e dos professores? Dê um exemplo de uma situação em que precisou trabalhar em equipe.",
  },
  {
    titulo: "Resolução de conflitos",
    texto: "Duas crianças começam a discutir e uma delas empurra a outra. O que você faria?",
  },
  {
    titulo: "Atenção aos detalhes",
    texto: "Durante o recreio, você percebe uma criança brincando de forma que pode machucar outra. Como agiria?",
  },
  {
    titulo: "Perfil profissional",
    texto: "Quais são seus três maiores pontos fortes? Existe algum aspecto que você gostaria de melhorar? Explique.",
  },
  {
    titulo: "Valores",
    texto: "O que significa, para você, tratar uma criança com respeito e acolhimento?",
  },
  {
    titulo: "Pergunta final",
    texto:
      "Por que você acredita que deve fazer parte da equipe da Escola CDA? O que você pode oferecer para contribuir com o dia a dia da escola?",
  },
] as const;

async function embarcarFundo(pdf: PDFDocument): Promise<PDFImage | null> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "ficha-matricula-fundo.png"));
    return await pdf.embedPng(bytes);
  } catch {
    return null;
  }
}

export async function gerarAvaliacaoEscritaPdf(): Promise<string> {
  const pdf = await PDFDocument.create();
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fundo = await embarcarFundo(pdf);

  function desenharFundo(p: PDFPage) {
    if (fundo) p.drawImage(fundo, { x: -4, y: 0, width: LARGURA + 4, height: ALTURA });
  }

  let pagina = pdf.addPage([LARGURA, ALTURA]);
  desenharFundo(pagina);
  let y = TOPO_CONTEUDO;

  function novaPagina() {
    pagina = pdf.addPage([LARGURA, ALTURA]);
    desenharFundo(pagina);
    y = TOPO_CONTEUDO;
  }

  function garantirEspaco(altura: number) {
    if (y - altura < RODAPE) novaPagina();
  }

  function quebrarLinhas(fnt: PDFFont, texto: string, tamanho: number, larguraMax: number): string[] {
    const palavras = texto.split(" ");
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

  function linhaEmBranco() {
    garantirEspaco(18);
    pagina.drawLine({
      start: { x: MARGEM, y },
      end: { x: MARGEM + LARGURA_UTIL, y },
      thickness: 0.6,
      color: AZUL_BORDA,
    });
    y -= 18;
  }

  // ---- Título ----
  pagina.drawText("AVALIAÇÃO ESCRITA — PROCESSO SELETIVO", { x: MARGEM, y, size: 13.5, font: fonteNegrito, color: PRETO });
  y -= 18;
  pagina.drawText("Cargo: Monitora — Escola CDA", { x: MARGEM, y, size: 10.5, font: fonteNegrito, color: CINZA });
  y -= 22;

  // ---- Campos de identificação ----
  pagina.drawText("Nome: ________________________________________________", { x: MARGEM, y, size: 10, font: fonte, color: PRETO });
  y -= 18;
  pagina.drawText("Data: ____/____/________", { x: MARGEM, y, size: 10, font: fonte, color: PRETO });
  const larguraData = fonte.widthOfTextAtSize("Data: ____/____/________", 10);
  pagina.drawText("Tempo sugerido: 30 a 40 minutos", { x: MARGEM + larguraData + 30, y, size: 10, font: fonte, color: CINZA });
  y -= 20;

  const orientacoes =
    "Orientações: Responda às questões utilizando suas próprias palavras. Não há respostas certas ou erradas. " +
    "Seja sincera e procure demonstrar como você pensa e age nas situações apresentadas.";
  for (const l of quebrarLinhas(fonte, orientacoes, 9.3, LARGURA_UTIL)) {
    garantirEspaco(12);
    pagina.drawText(l, { x: MARGEM, y, size: 9.3, font: fonte, color: CINZA });
    y -= 12;
  }
  y -= 14;

  // ---- Perguntas ----
  PERGUNTAS.forEach((p, i) => {
    garantirEspaco(30);
    pagina.drawText(`${i + 1}. ${p.titulo}`, { x: MARGEM, y, size: 10.5, font: fonteNegrito, color: PRETO });
    y -= 15;
    for (const l of quebrarLinhas(fonte, p.texto, 9.7, LARGURA_UTIL)) {
      garantirEspaco(13);
      pagina.drawText(l, { x: MARGEM, y, size: 9.7, font: fonte, color: PRETO });
      y -= 13;
    }
    y -= 6;
    for (let j = 0; j < 4; j++) linhaEmBranco();
    y -= 10;
  });

  // ---- Redação ----
  garantirEspaco(40);
  pagina.drawText("Redação", { x: MARGEM, y, size: 11.5, font: fonteNegrito, color: PRETO });
  y -= 16;
  for (const l of quebrarLinhas(
    fonte,
    "Em aproximadamente 10 linhas, descreva o que significa, para você, cuidar de uma criança dentro do ambiente escolar.",
    9.7,
    LARGURA_UTIL
  )) {
    garantirEspaco(13);
    pagina.drawText(l, { x: MARGEM, y, size: 9.7, font: fonte, color: PRETO });
    y -= 13;
  }
  y -= 6;
  for (let j = 0; j < 10; j++) linhaEmBranco();

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}
