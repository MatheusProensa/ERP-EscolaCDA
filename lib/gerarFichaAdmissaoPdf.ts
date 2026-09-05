import { PDFDocument, StandardFonts, rgb, type PDFImage } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";

/**
 * Ficha para Admissão de Funcionário — modelo que a escola já usava (feito
 * pela contabilidade terceirizada "Novo Tempo"), recriado com o timbrado da
 * própria escola. É documento estático pra imprimir e preencher à mão (fica
 * em Documentos institucionais, categoria RH) — não tem campo dinâmico.
 */

const AZUL_BORDA = rgb(0x00 / 255, 0xaf / 255, 0xef / 255);
const CINZA = rgb(0x5a / 255, 0x6a / 255, 0x85 / 255);
const PRETO = rgb(0, 0, 0);

const LARGURA = 595;
const ALTURA = 842;
const MARGEM = 48;
// O timbrado novo (pedido do dono da escola, ago/2026) não tem mais o rodapé com
// endereço/telefone/@ desenhado na própria imagem — esse texto é desenhado aqui por
// cima do fundo agora, pra essa informação não sumir dos documentos.
const TEXTO_RODAPE = "Educação Infantil e Ensino Fundamental  ·  R. José Manhago, 194 - Camobi, Santa Maria - RS  ·  (55) 3217-7947  ·  @escolacda.sm";
const TOPO_CONTEUDO = ALTURA - 130;
const RODAPE = 45;
const LARGURA_UTIL = LARGURA - MARGEM * 2;

async function embarcarFundo(pdf: PDFDocument): Promise<PDFImage | null> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "ficha-matricula-fundo.png"));
    return await pdf.embedPng(bytes);
  } catch {
    return null;
  }
}

export async function gerarFichaAdmissaoPdf(): Promise<string> {
  const pdf = await PDFDocument.create();
  // Nome de verdade dentro do PDF (metadado /Title) — sem isso, quando a pessoa
  // abre o PDF (é um data: URI, sem nome de arquivo/URL de origem) e tenta salvar
  // pelo visualizador do navegador, ele inventa um nome tipo UUID em vez de usar
  // algo que identifique o documento.
  pdf.setTitle("Ficha para Admissão de Funcionário — Escola CDA");
  pdf.setAuthor("Escola CDA");
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fundo = await embarcarFundo(pdf);

  const pagina = pdf.addPage([LARGURA, ALTURA]);
  if (fundo) pagina.drawImage(fundo, { x: -4, y: 0, width: LARGURA + 4, height: ALTURA });
  {
    const tamanhoRodape = 7;
    const larguraRodape = fonte.widthOfTextAtSize(TEXTO_RODAPE, tamanhoRodape);
    pagina.drawText(TEXTO_RODAPE, { x: (LARGURA - larguraRodape) / 2, y: 24, size: tamanhoRodape, font: fonte, color: CINZA });
  }
  let y = TOPO_CONTEUDO;

  function tituloSecao(texto: string) {
    y -= 4;
    pagina.drawRectangle({ x: MARGEM, y: y - 16, width: LARGURA_UTIL, height: 18, color: rgb(0xe3 / 255, 0xe7 / 255, 0xef / 255) });
    pagina.drawText(texto.toUpperCase(), { x: MARGEM + 6, y: y - 12, size: 9.5, font: fonteNegrito, color: rgb(0x0d / 255, 0x1f / 255, 0x4e / 255) });
    y -= 26;
  }

  function linhaCampos(partes: { label: string; peso?: number; valor?: string }[], altura = 20) {
    const pesoTotal = partes.reduce((s, p) => s + (p.peso ?? 1), 0);
    const yTopo = y;
    const yBase = y - altura;
    pagina.drawRectangle({ x: MARGEM, y: yBase, width: LARGURA_UTIL, height: altura, borderColor: AZUL_BORDA, borderWidth: 0.75 });
    let xAcc = MARGEM;
    partes.forEach((p, i) => {
      const larguraCol = (LARGURA_UTIL * (p.peso ?? 1)) / pesoTotal;
      if (i > 0) pagina.drawLine({ start: { x: xAcc, y: yTopo }, end: { x: xAcc, y: yBase }, thickness: 0.75, color: AZUL_BORDA });
      pagina.drawText(`${p.label}:`, { x: xAcc + 5, y: yTopo - 12, size: 8.3, font: fonteNegrito, color: CINZA });
      if (p.valor) {
        const larguraLabel = fonteNegrito.widthOfTextAtSize(`${p.label}: `, 8.3);
        // \r/\n (texto colado do Windows/Word num campo do cadastro) quebra o
        // pdf-lib ("WinAnsi cannot encode") mesmo com maxWidth.
        const valor = p.valor.replace(/[\r\n]+/g, " ").trim();
        pagina.drawText(valor, { x: xAcc + 5 + larguraLabel, y: yTopo - 12, size: 8.7, font: fonte, color: PRETO, maxWidth: larguraCol - larguraLabel - 10 });
      }
      xAcc += larguraCol;
    });
    y = yBase;
  }

  function checklistItem(texto: string) {
    pagina.drawText("(   )", { x: MARGEM, y, size: 9.5, font: fonte, color: PRETO });
    pagina.drawText(texto, { x: MARGEM + 30, y, size: 9, font: fonte, color: PRETO, maxWidth: LARGURA_UTIL - 30 });
    y -= 16;
  }

  // ---- Título ----
  pagina.drawText("FICHA PARA ADMISSÃO DE FUNCIONÁRIO", { x: MARGEM, y, size: 13, font: fonteNegrito, color: PRETO });
  y -= 22;

  // ---- Dados do empregador (fixo — sempre a escola) ----
  tituloSecao("Dados do empregador");
  linhaCampos([{ label: "Nome da empresa", valor: "Guntzel & Proensa LTDA - ME (Escola CDA) — CNPJ 12.614.675/0001-00" }]);
  y -= 8;

  // ---- Dados pessoais do funcionário (em branco, pra preencher à mão) ----
  tituloSecao("Dados pessoais do(a) funcionário(a)");
  linhaCampos([{ label: "Nome completo" }]);
  linhaCampos([{ label: "Grau de escolaridade" }, { label: "Estado civil" }]);
  linhaCampos([{ label: "CPF" }, { label: "PIS" }]);
  linhaCampos(
    [{ label: "Raça", valor: "(   ) Indígena   (   ) Branca   (   ) Negra   (   ) Amarela   (   ) Parda   (   ) Não informado" }],
    22
  );
  linhaCampos([{ label: "Possui filhos?", valor: "(   ) Não   (   ) Sim", peso: 1 }, { label: "Celular", peso: 1.2 }, { label: "Celular 2 / Fixo", peso: 1.2 }]);
  linhaCampos([
    { label: "Já é aposentado(a)?", valor: "(   ) Não   (   ) Sim" },
    { label: "Outro emprego c/ carteira assinada?", valor: "(   ) Não   (   ) Sim — Qual empresa?" },
  ]);
  y -= 8;

  // ---- Dados do contrato de trabalho (preenchimento do empregador) ----
  tituloSecao("Dados do contrato de trabalho (preenchimento do empregador)");
  linhaCampos([{ label: "Data de admissão" }, { label: "Função" }]);
  linhaCampos([{ label: "Jornada de trabalho semanal", valor: "(   ) Segunda a Sexta   (   ) Segunda a Sábado   (   ) Outro:" }]);
  linhaCampos([{ label: "Horários — seg. a sex." }, { label: "Horários — sábado" }], 24);
  linhaCampos([
    { label: "Salário", valor: "(   ) Piso da categoria   (   ) Outro: R$" },
    { label: "Vale transporte", valor: "(   ) Não   (   ) Sim   Quantos? ___/dia" },
  ]);
  y -= 12;

  // ---- Checklist de documentos ----
  tituloSecao("Checklist de documentos");
  checklistItem("Atestado de Saúde Ocupacional — ASO (Exame Admissional)");
  checklistItem("Número do PIS");
  checklistItem("Carteira Profissional — CTPS");
  checklistItem("Cópia Identidade e CPF");
  checklistItem("Cópia Comprovante de Residência");
  checklistItem("1 Foto 3x4");
  checklistItem("Certidão de Nascimento dos filhos e CPF dos dependentes (obrigatório)");
  checklistItem("Comprovante de Matrícula e Frequência Escolar dos filhos (maiores de 7 anos)");
  checklistItem("Carteira de Vacinação dos filhos (menores de 7 anos)");
  checklistItem("**Professores — Certificado de Conclusão de Curso Superior e/ou Certificado de Pós, Doutorado ou Especialização");

  void RODAPE;
  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}
