import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatarData, formatarCPF, formatarTelefone } from "@/lib/utils";
import { TEXTO_AUTORIZACAO_IMAGEM, TEXTO_DECLARACAO_MATRICULA, marca } from "@/lib/fichaMatriculaTexto";

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

const AZUL_NAVY = rgb(0x0d / 255, 0x1f / 255, 0x4e / 255);
const CINZA = rgb(0x5a / 255, 0x6a / 255, 0x85 / 255);
const CINZA_LINHA = rgb(0xd8 / 255, 0xdc / 255, 0xe4 / 255);
const PRETO = rgb(0, 0, 0);

const LARGURA = 595;
const ALTURA = 842; // A4
const MARGEM = 48;
const RODAPE = 40;
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

export async function gerarFichaMatriculaPdf(d: DadosFichaMatricula): Promise<string> {
  const pdf = await PDFDocument.create();
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await pdf.embedFont(StandardFonts.HelveticaBold);

  let pagina = pdf.addPage([LARGURA, ALTURA]);
  let y = ALTURA - 50;

  function novaPagina() {
    pagina = pdf.addPage([LARGURA, ALTURA]);
    y = ALTURA - 50;
  }

  function garantirEspaco(altura: number) {
    if (y - altura < RODAPE) novaPagina();
  }

  function quebrarLinhas(texto: string, tamanho: number, larguraMax: number): string[] {
    const palavras = texto.split(" ");
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

  /** Uma "linha de campos" da ficha real: um ou mais "Rótulo: valor" na mesma linha, com régua embaixo. */
  function linhaCampos(partes: { label: string; valor: string }[], opts?: { semRegua?: boolean }) {
    garantirEspaco(20);
    const larguraCol = LARGURA_UTIL / partes.length;
    partes.forEach((p, i) => {
      const x = MARGEM + i * larguraCol;
      pagina.drawText(`${p.label}: `, { x, y, size: 8.5, font: fonteNegrito, color: CINZA });
      const larguraLabel = fonteNegrito.widthOfTextAtSize(`${p.label}: `, 8.5);
      pagina.drawText(p.valor, { x: x + larguraLabel, y, size: 9, font: fonte, color: PRETO, maxWidth: larguraCol - larguraLabel - 4 });
    });
    y -= 9;
    if (!opts?.semRegua) {
      pagina.drawLine({ start: { x: MARGEM, y }, end: { x: MARGEM + LARGURA_UTIL, y }, thickness: 0.5, color: CINZA_LINHA });
    }
    y -= 10;
  }

  function blocoTexto(label: string, texto: string) {
    garantirEspaco(20);
    pagina.drawText(`${label}: `, { x: MARGEM, y, size: 8.5, font: fonteNegrito, color: CINZA });
    const larguraLabel = fonteNegrito.widthOfTextAtSize(`${label}: `, 8.5);
    const primeiraLinhaLargura = LARGURA_UTIL - larguraLabel;
    const linhas = quebrarLinhas(texto || "—", 9, primeiraLinhaLargura > 120 ? primeiraLinhaLargura : LARGURA_UTIL);
    pagina.drawText(linhas[0] ?? "—", { x: MARGEM + larguraLabel, y, size: 9, font: fonte, color: PRETO });
    y -= 12;
    for (const l of linhas.slice(1)) {
      garantirEspaco(11);
      pagina.drawText(l, { x: MARGEM, y, size: 9, font: fonte, color: PRETO });
      y -= 11;
    }
    y -= 2;
    pagina.drawLine({ start: { x: MARGEM, y }, end: { x: MARGEM + LARGURA_UTIL, y }, thickness: 0.5, color: CINZA_LINHA });
    y -= 10;
  }

  // ---- Cabeçalho ----
  pagina.drawText("ESCOLA CDA", { x: MARGEM, y, size: 16, font: fonteNegrito, color: AZUL_NAVY });
  y -= 14;
  pagina.drawText("Onde, há 15 anos, família e escola sonham juntas", { x: MARGEM, y, size: 9, font: fonte, color: CINZA });
  y -= 24;
  pagina.drawText(`FICHA DE MATRÍCULA ${d.anoLetivo}`, { x: MARGEM, y, size: 13, font: fonteNegrito, color: PRETO });
  y -= 20;

  // ---- Tabela de identificação (mesma ordem do modelo em papel) ----
  linhaCampos([
    { label: "Data de ingresso/renovação", valor: formatarData(d.dataIngresso) },
    { label: "Turno", valor: `${marca("Manhã", d.turnoLabel === "Manhã")}  ${marca("Tarde", d.turnoLabel === "Tarde")}  ${marca("Integral", d.turnoLabel === "Integral")}  ${marca("Contraturno", d.turnoLabel === "Contraturno")}` },
  ]);
  linhaCampos([
    { label: "Data de Nascimento", valor: formatarData(d.alunoDataNascimento) },
    { label: "Idade", valor: calcularIdade(d.alunoDataNascimento, new Date()) },
    { label: "Sexo", valor: `${marca("Masculino", d.sexo === "M")}  ${marca("Feminino", d.sexo === "F")}` },
  ]);
  linhaCampos([
    { label: "Nome completo", valor: d.alunoNome },
    { label: "CPF", valor: d.alunoCpf ? formatarCPF(d.alunoCpf) : "—" },
  ]);
  linhaCampos([
    {
      label: "Raça/etnia",
      valor: ["Branca", "Preta", "Indígena", "Parda", "Amarela", "N.D."].map((r) => marca(r, d.racaCorLabel === r || (r === "N.D." && d.racaCorLabel === "Não declarada"))).join("  "),
    },
  ]);

  function linhasResponsavel(rotulo: "Pai" | "Mãe", r: DadosResponsavelFicha) {
    linhaCampos([
      { label: `Nome do(a) ${rotulo}`, valor: r?.nome || "—" },
      { label: "RG", valor: r?.rg || "—" },
    ]);
    linhaCampos([
      { label: "CPF", valor: r?.cpf ? formatarCPF(r.cpf) : "—" },
      { label: "E-mail", valor: r?.email || "—" },
    ]);
    linhaCampos([
      { label: "Escolaridade", valor: r?.escolaridade || "—" },
      { label: "Profissão", valor: r?.profissao || "—" },
    ]);
    linhaCampos([
      { label: "Endereço", valor: r?.endereco || "—" },
      { label: "CEP", valor: r?.cep || "—" },
    ]);
    linhaCampos([
      { label: "Tel. Fixo", valor: r?.telefoneFixo ? formatarTelefone(r.telefoneFixo) : "—" },
      { label: "Celular", valor: r?.telefoneCelular ? formatarTelefone(r.telefoneCelular) : "—" },
      { label: "Tel. Comercial", valor: r?.telefoneComercial ? formatarTelefone(r.telefoneComercial) : "—" },
    ]);
  }
  linhasResponsavel("Pai", d.pai);
  linhasResponsavel("Mãe", d.mae);

  linhaCampos([
    { label: "Tem irmãos?", valor: `${marca("Sim", d.temIrmaos)}  ${marca("Não", d.temIrmaos === false)}    Idades respectivas: ${d.idadesIrmaos || "—"}` },
  ]);
  linhaCampos([
    { label: "Usa bico?", valor: `${marca("Sim", d.usaBico)}  ${marca("Não", d.usaBico === false)}` },
    { label: "Usa mamadeira?", valor: `${marca("Sim", d.usaMamadeira)}  ${marca("Não", d.usaMamadeira === false)}` },
  ]);
  if (d.obsBicoMamadeira) blocoTexto("Obs. (bico/mamadeira)", d.obsBicoMamadeira);
  linhaCampos([
    { label: "Já frequentou outra escola?", valor: `${marca("Sim", d.jaFrequentouEscola)}  ${marca("Não", d.jaFrequentouEscola === false)}    Duração: ${d.duracaoEscolaAnterior || "—"}` },
  ]);
  linhaCampos([
    { label: "Possui algum problema de saúde?", valor: `${marca("Sim", d.temProblemaSaude)}  ${marca("Não", !d.temProblemaSaude)}` },
  ]);
  if (d.temProblemaSaude) blocoTexto("Obs. (saúde)", d.obsSaude);
  blocoTexto("Questões relacionadas ao sono/alimentação", d.rotinaSonoAlimentacao || "—");
  blocoTexto("Brincadeiras prediletas", d.brincadeirasPrediletas || "—");
  blocoTexto("Reações quando contrariado(a)", d.reacoesContrariado || "—");

  const maeAutorizada = !!d.mae;
  const paiAutorizado = !!d.pai;
  linhaCampos([
    { label: "Pessoas autorizadas a buscar o aluno", valor: `${marca("Mãe", maeAutorizada)}  ${marca("Pai", paiAutorizado)}` },
  ], { semRegua: true });
  y -= 2;
  const outras = d.pessoasAutorizadas.slice(0, 3);
  for (let i = 0; i < 3; i++) {
    const p = outras[i];
    garantirEspaco(14);
    pagina.drawText(`${i + 1}) Nome: ${p?.nome || "_______________________"}    Parentesco: ${p?.parentesco || "___________"}`, {
      x: MARGEM,
      y,
      size: 9,
      font: fonte,
      color: p ? PRETO : CINZA,
    });
    y -= 15;
  }

  // ---- Autorização de imagem ----
  y -= 6;
  garantirEspaco(13);
  for (const l of quebrarLinhas(TEXTO_AUTORIZACAO_IMAGEM, 9, LARGURA_UTIL)) {
    garantirEspaco(12);
    pagina.drawText(l, { x: MARGEM, y, size: 9, font: fonte, color: PRETO });
    y -= 12;
  }
  garantirEspaco(14);
  pagina.drawText(`${marca("Sim", d.autorizaImagemMarcado)}     ${marca("Não", d.autorizaImagemMarcado === false)}`, {
    x: MARGEM,
    y,
    size: 9.5,
    font: fonteNegrito,
  });
  y -= 26;

  // ---- Declaração e assinatura ----
  garantirEspaco(13);
  for (const l of quebrarLinhas(TEXTO_DECLARACAO_MATRICULA, 9.5, LARGURA_UTIL)) {
    garantirEspaco(13);
    pagina.drawText(l, { x: MARGEM, y, size: 9.5, font: fonte, color: PRETO });
    y -= 13;
  }
  y -= 24;

  garantirEspaco(60);
  pagina.drawText(`Santa Maria - RS, ${formatarData(new Date())}.`, { x: MARGEM, y, size: 9.5, font: fonte, color: PRETO });
  y -= 42;
  garantirEspaco(24);
  pagina.drawText("_________________________________", { x: MARGEM, y, size: 10, font: fonte });
  y -= 12;
  pagina.drawText("Ass. do Responsável", { x: MARGEM, y, size: 8.5, font: fonte, color: CINZA });

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}
