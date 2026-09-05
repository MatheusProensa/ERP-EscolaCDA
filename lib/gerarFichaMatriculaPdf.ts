import { PDFDocument, StandardFonts, rgb, type PDFImage } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";
import { formatarData, formatarCPF, formatarTelefone, hojeBrasilia } from "@/lib/utils";
import { TEXTO_AUTORIZACAO_IMAGEM, TEXTO_DECLARACAO_MATRICULA, marca } from "@/lib/fichaMatriculaTexto";

/** Papel timbrado real da escola (extraído do modelo .docx oficial) — logo,
 * faixa colorida "Onde, há 15 anos..." e rodapé com endereço/telefone/@.
 * Fica como fundo de cada página; só desenhamos o conteúdo por cima. */
async function embarcarFundo(pdf: PDFDocument): Promise<PDFImage | null> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "ficha-matricula-fundo.png"));
    return await pdf.embedPng(bytes);
  } catch {
    return null;
  }
}

export type DadosResponsavelFicha = {
  nome: string;
  rg: string | null;
  cpf: string | null;
  email: string | null;
  escolaridade: string | null;
  profissao: string | null;
  endereco: string | null;
  cep: string | null;
  telefoneFixo: string | null;
  telefoneComercial: string | null;
  telefoneCelular: string | null;
} | null;

export type DadosFichaMatricula = {
  anoLetivo: number;
  dataIngresso: Date;
  /** Manhã / Tarde / Integral / Contraturno — ver nota em lib/contratoTexto sobre o gap de modelagem do turno. */
  turnoLabel: string;
  alunoNome: string;
  alunoDataNascimento: Date;
  alunoCpf: string | null;
  sexo: "M" | "F" | null;
  racaCorLabel: string | null;
  autorizaImagemMarcado: boolean | null;
  temIrmaos: boolean | null;
  idadesIrmaos: string | null;
  usaBico: boolean | null;
  usaMamadeira: boolean | null;
  obsBicoMamadeira: string | null;
  jaFrequentouEscola: boolean | null;
  duracaoEscolaAnterior: string | null;
  temProblemaSaude: boolean;
  obsSaude: string;
  rotinaSonoAlimentacao: string | null;
  brincadeirasPrediletas: string | null;
  reacoesContrariado: string | null;
  pai: DadosResponsavelFicha;
  mae: DadosResponsavelFicha;
  pessoasAutorizadas: { nome: string; parentesco: string }[];
};

// Mesma cor de borda usada na ficha em papel da escola (extraída do .docx original: #00AFEF).
const AZUL_BORDA = rgb(0x00 / 255, 0xaf / 255, 0xef / 255);
const CINZA = rgb(0x5a / 255, 0x6a / 255, 0x85 / 255);
const PRETO = rgb(0, 0, 0);

const LARGURA = 595;
const ALTURA = 842; // A4
const MARGEM = 54;
// O timbrado novo (pedido do dono da escola, ago/2026) não tem mais o rodapé com
// endereço/telefone/@ desenhado na própria imagem — esse texto é desenhado aqui por
// cima do fundo agora, pra essa informação não sumir dos documentos.
const TEXTO_RODAPE = "Educação Infantil e Ensino Fundamental  ·  R. José Manhago, 194 - Camobi, Santa Maria - RS  ·  (55) 3217-7947  ·  @escolacda.sm";
// O papel timbrado já tem a faixa do cabeçalho (logo) e o rodapé (endereço/telefone) desenhados
// na imagem de fundo — o conteúdo precisa ficar dentro da área branca, sem sobrepor essas faixas.
const TOPO_CONTEUDO = ALTURA - 125;
const RODAPE = 42;
const LARGURA_UTIL = LARGURA - MARGEM * 2;

function calcularIdade(nascimento: Date, referencia: Date): string {
  let anos = referencia.getFullYear() - nascimento.getFullYear();
  let meses = referencia.getMonth() - nascimento.getMonth();
  if (referencia.getDate() < nascimento.getDate()) meses -= 1;
  if (meses < 0) {
    anos -= 1;
    meses += 12;
  }
  return anos <= 0 ? `${meses} mes(es)` : `${anos} ano(s) e ${meses} mes(es)`;
}

type Coluna = { label: string; valor: string; peso?: number };

export async function gerarFichaMatriculaPdf(d: DadosFichaMatricula): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Ficha de Matrícula — ${d.alunoNome} — Escola CDA`);
  pdf.setAuthor("Escola CDA");
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fundo = await embarcarFundo(pdf);

  function desenharFundo(p: import("pdf-lib").PDFPage) {
    // O PNG do timbrado tem uma sobra de ~5px branca só na borda esquerda (artefato de quando foi
    // exportado do Word) — desenha um pouco maior/deslocado à esquerda pra empurrar essa tira
    // branca pra fora da página, sem distorcer o resto (a borda direita fica intacta).
    if (fundo) p.drawImage(fundo, { x: -4, y: 0, width: LARGURA + 4, height: ALTURA });
    const tamanhoRodape = 7;
    const larguraRodape = fonte.widthOfTextAtSize(TEXTO_RODAPE, tamanhoRodape);
    p.drawText(TEXTO_RODAPE, { x: (LARGURA - larguraRodape) / 2, y: 24, size: tamanhoRodape, font: fonte, color: CINZA });
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

  function quebrarLinhas(texto: string, tamanho: number, larguraMax: number): string[] {
    // \r/\n (texto colado do Windows/Word) quebra o pdf-lib ("WinAnsi cannot
    // encode") — essa função só reflui por espaço, então normaliza pra espaço.
    const palavras = texto.replace(/[\r\n]+/g, " ").split(" ");
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

  /** Rótulo:valor na mesma linha (formato real do documento — não empilhado). */
  function linhaGradeInline(colunas: Coluna[], opts?: { altura?: number }) {
    const pesoTotal = colunas.reduce((s, c) => s + (c.peso ?? 1), 0);
    const alturaLinha = opts?.altura ?? 15;
    garantirEspaco(alturaLinha);
    const yTopo = y;
    const yBase = y - alturaLinha;

    pagina.drawRectangle({ x: MARGEM, y: yBase, width: LARGURA_UTIL, height: alturaLinha, borderColor: AZUL_BORDA, borderWidth: 0.75 });

    let xAcc = MARGEM;
    const yTexto = yTopo - alturaLinha / 2 - 2.6;
    colunas.forEach((c, i) => {
      const larguraCol = (LARGURA_UTIL * (c.peso ?? 1)) / pesoTotal;
      if (i > 0) pagina.drawLine({ start: { x: xAcc, y: yTopo }, end: { x: xAcc, y: yBase }, thickness: 0.75, color: AZUL_BORDA });
      pagina.drawText(`${c.label}: `, { x: xAcc + 4, y: yTexto, size: 7.2, font: fonteNegrito, color: CINZA });
      const larguraLabel = fonteNegrito.widthOfTextAtSize(`${c.label}: `, 7.2);
      // \r/\n no cadastro (colado do Windows/Word) quebra o pdf-lib mesmo com maxWidth.
      pagina.drawText(c.valor.replace(/[\r\n]+/g, " ").trim(), { x: xAcc + 4 + larguraLabel, y: yTexto, size: 7.6, font: fonte, color: PRETO, maxWidth: larguraCol - larguraLabel - 8 });
      xAcc += larguraCol;
    });
    y = yBase;
  }

  /** Linha da grade cujo valor é um texto livre que pode quebrar em várias linhas. */
  function linhaTexto(label: string, texto: string) {
    // \r/\n quebra o pdf-lib ("WinAnsi cannot encode") — essa função só
    // reflui por espaço, não por quebra de linha própria.
    const valor = (texto || "Não informado").replace(/[\r\n]+/g, " ").trim();
    const rotulo = `${label}: `;
    const larguraRotulo = fonteNegrito.widthOfTextAtSize(rotulo, 7.2);
    const xValor = MARGEM + 4 + larguraRotulo;
    const larguraPrimeiraLinha = LARGURA_UTIL - 4 - larguraRotulo;
    const larguraDemaisLinhas = LARGURA_UTIL - 8;

    // Quebra a primeira linha considerando o espaço já ocupado pelo rótulo, e as demais usando a largura toda.
    const palavras = valor.split(" ");
    const linhas: string[] = [];
    let atual = "";
    let primeira = true;
    for (const palavra of palavras) {
      const teste = atual ? `${atual} ${palavra}` : palavra;
      const limite = primeira ? larguraPrimeiraLinha : larguraDemaisLinhas;
      if (fonte.widthOfTextAtSize(teste, 7.6) > limite && atual) {
        linhas.push(atual);
        atual = palavra;
        primeira = false;
      } else {
        atual = teste;
      }
    }
    if (atual) linhas.push(atual);

    const alturaLinha = Math.max(14, 8 + linhas.length * 9.5);
    garantirEspaco(alturaLinha);
    const yTopo = y;
    const yBase = y - alturaLinha;
    pagina.drawRectangle({ x: MARGEM, y: yBase, width: LARGURA_UTIL, height: alturaLinha, borderColor: AZUL_BORDA, borderWidth: 0.75 });
    pagina.drawText(rotulo, { x: MARGEM + 4, y: yTopo - 10, size: 7.2, font: fonteNegrito, color: CINZA });
    let ly = yTopo - 10;
    linhas.forEach((l, i) => {
      pagina.drawText(l, { x: i === 0 ? xValor : MARGEM + 4, y: ly, size: 7.6, font: fonte, color: PRETO });
      ly -= 9.5;
    });
    y = yBase;
  }

  // ---- Título (o cabeçalho com logo já vem do papel timbrado de fundo) ----
  pagina.drawText(`FICHA DE MATRÍCULA ${d.anoLetivo}`, { x: MARGEM, y, size: 13, font: fonteNegrito, color: PRETO });
  y -= 16;

  // ---- Grade de identificação (mesma ordem/colunas do modelo em papel) ----
  linhaGradeInline([
    { label: "Data de ingresso/renovação", valor: formatarData(d.dataIngresso), peso: 1.4 },
    {
      label: "Turno",
      valor: `${marca("Tarde", d.turnoLabel === "Tarde")} ${marca("Integral", d.turnoLabel === "Integral")} ${marca("Contraturno", d.turnoLabel === "Contraturno")}`,
      peso: 1.6,
    },
  ]);
  linhaGradeInline([
    { label: "Data de Nascimento", valor: formatarData(d.alunoDataNascimento) },
    { label: "Idade", valor: calcularIdade(d.alunoDataNascimento, new Date()), peso: 0.7 },
    { label: "Sexo", valor: `${marca("Masculino", d.sexo === "M")} ${marca("Feminino", d.sexo === "F")}`, peso: 1.1 },
  ]);
  linhaGradeInline([
    { label: "Nome completo", valor: d.alunoNome, peso: 2 },
    { label: "CPF", valor: d.alunoCpf ? formatarCPF(d.alunoCpf) : "Não informado" },
  ]);
  linhaGradeInline([
    {
      label: "Raça/etnia",
      valor: ["Branca", "Preta", "Indígena", "Parda", "Amarela", "N.D."]
        .map((r) => marca(r, d.racaCorLabel === r || (r === "N.D." && d.racaCorLabel === "Não declarada")))
        .join("  "),
    },
  ]);

  function linhasResponsavel(rotulo: "Pai" | "Mãe", r: DadosResponsavelFicha) {
    linhaGradeInline([
      { label: `Nome do(a) ${rotulo}`, valor: r?.nome || "Não informado", peso: 2 },
      { label: "RG", valor: r?.rg || "Não informado" },
    ]);
    linhaGradeInline([
      { label: "CPF", valor: r?.cpf ? formatarCPF(r.cpf) : "Não informado" },
      { label: "E-mail", valor: r?.email || "Não informado", peso: 2 },
    ]);
    linhaGradeInline([
      { label: "Escolaridade", valor: r?.escolaridade || "Não informado" },
      { label: "Profissão", valor: r?.profissao || "Não informado" },
    ]);
    linhaGradeInline([
      { label: "Endereço", valor: r?.endereco || "Não informado", peso: 2 },
      { label: "CEP", valor: r?.cep || "Não informado" },
    ]);
    linhaGradeInline([
      { label: "Tel. Fixo", valor: r?.telefoneFixo ? formatarTelefone(r.telefoneFixo) : "Não informado" },
      { label: "Celular", valor: r?.telefoneCelular ? formatarTelefone(r.telefoneCelular) : "Não informado" },
      { label: "Tel. Comercial", valor: r?.telefoneComercial ? formatarTelefone(r.telefoneComercial) : "Não informado" },
    ]);
  }
  linhasResponsavel("Pai", d.pai);
  linhasResponsavel("Mãe", d.mae);

  linhaGradeInline([
    {
      label: "Tem irmãos?",
      valor: `${marca("Sim", d.temIrmaos)} ${marca("Não", d.temIrmaos === false)}    Idades respectivas: ${d.idadesIrmaos || "Não informado"}`,
    },
  ]);
  linhaGradeInline([
    { label: "Usa bico?", valor: `${marca("Sim", d.usaBico)} ${marca("Não", d.usaBico === false)}` },
    { label: "Usa mamadeira?", valor: `${marca("Sim", d.usaMamadeira)} ${marca("Não", d.usaMamadeira === false)}` },
  ]);
  if (d.obsBicoMamadeira) linhaTexto("Obs. (bico/mamadeira)", d.obsBicoMamadeira);
  linhaGradeInline([
    {
      label: "Já frequentou outra escola?",
      valor: `${marca("Sim", d.jaFrequentouEscola)} ${marca("Não", d.jaFrequentouEscola === false)}    Duração: ${d.duracaoEscolaAnterior || "Não informado"}`,
    },
  ]);
  linhaGradeInline([
    { label: "Possui algum problema de saúde?", valor: `${marca("Sim", d.temProblemaSaude)} ${marca("Não", !d.temProblemaSaude)}` },
  ]);
  if (d.temProblemaSaude) linhaTexto("Obs. (saúde)", d.obsSaude);
  linhaTexto("Questões relacionadas ao sono/alimentação", d.rotinaSonoAlimentacao || "Não informado");
  linhaTexto("Brincadeiras prediletas", d.brincadeirasPrediletas || "Não informado");
  linhaTexto("Reações quando contrariado(a)", d.reacoesContrariado || "Não informado");

  linhaGradeInline([
    { label: "Pessoas autorizadas a buscar o aluno", valor: `${marca("Mãe", !!d.mae)} ${marca("Pai", !!d.pai)}` },
  ]);
  const outras = d.pessoasAutorizadas.slice(0, 3);
  for (let i = 0; i < 3; i++) {
    const p = outras[i];
    linhaGradeInline([
      { label: `${i + 1}) Nome`, valor: p?.nome || "", peso: 1.6 },
      { label: "Parentesco", valor: p?.parentesco || "" },
    ]);
  }

  // ---- Autorização de imagem (fora da grade, igual ao modelo) ----
  y -= 16;
  garantirEspaco(11);
  for (const l of quebrarLinhas(TEXTO_AUTORIZACAO_IMAGEM, 8.3, LARGURA_UTIL)) {
    garantirEspaco(10.5);
    pagina.drawText(l, { x: MARGEM, y, size: 8.3, font: fonte, color: PRETO });
    y -= 10.5;
  }
  garantirEspaco(13);
  pagina.drawText(`${marca("Sim", d.autorizaImagemMarcado)}     ${marca("Não", d.autorizaImagemMarcado === false)}`, {
    x: MARGEM,
    y,
    size: 9,
    font: fonteNegrito,
  });
  y -= 14;

  // ---- Declaração e assinatura ----
  garantirEspaco(11)
  for (const l of quebrarLinhas(TEXTO_DECLARACAO_MATRICULA, 8.7, LARGURA_UTIL)) {
    garantirEspaco(11);
    pagina.drawText(l, { x: MARGEM, y, size: 8.7, font: fonte, color: PRETO });
    y -= 11;
  }
  y -= 12;

  garantirEspaco(48);
  // hojeBrasilia() (não new Date()): formatarData lê em UTC — aplicado direto
  // sobre o instante agora, geraria a ficha com a data de amanhã pra quem
  // imprimisse depois das 21h em Brasília.
  pagina.drawText(`Santa Maria - RS, ${formatarData(hojeBrasilia())}.`, { x: MARGEM, y, size: 9, font: fonte, color: PRETO });
  y -= 28;
  garantirEspaco(20);
  // Assinatura centralizada embaixo do risco (não colada à margem esquerda).
  const linhaAssinatura = "_________________________________";
  const larguraLinhaAssinatura = fonte.widthOfTextAtSize(linhaAssinatura, 10);
  const xLinhaAssinatura = MARGEM + (LARGURA_UTIL - larguraLinhaAssinatura) / 2;
  pagina.drawText(linhaAssinatura, { x: xLinhaAssinatura, y, size: 10, font: fonte });
  y -= 10;
  const rotuloAssinatura = "Ass. do Responsável";
  const larguraRotuloAssinatura = fonte.widthOfTextAtSize(rotuloAssinatura, 8.5);
  pagina.drawText(rotuloAssinatura, {
    x: MARGEM + (LARGURA_UTIL - larguraRotuloAssinatura) / 2,
    y,
    size: 8.5,
    font: fonte,
    color: CINZA,
  });

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}
