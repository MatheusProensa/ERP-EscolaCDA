import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatarData, formatarCPF, formatarTelefone } from "@/lib/utils";

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
  turnoLabel: string;
  alunoNome: string;
  alunoDataNascimento: Date;
  alunoCpf: string | null;
  sexoLabel: string | null;
  racaCorLabel: string | null;
  autorizacaoImagem: boolean;
  temIrmaos: boolean | null;
  idadesIrmaos: string | null;
  usaBico: boolean | null;
  usaMamadeira: boolean | null;
  obsBicoMamadeira: string | null;
  jaFrequentouEscola: boolean | null;
  duracaoEscolaAnterior: string | null;
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
const CINZA_CLARO = rgb(0xe3 / 255, 0xe7 / 255, 0xef / 255);
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
  if (anos <= 0) return `${meses} mes(es)`;
  return `${anos} ano(s) e ${meses} mes(es)`;
}

const naoInf = (v: string | null | undefined) => (v && v.trim() ? v : "Não informado");
const simNao = (v: boolean | null | undefined) => (v == null ? "Não informado" : v ? "Sim" : "Não");

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

  function quebrarLinhas(texto: string, tamanho: number, larguraMax: number, negrito = false): string[] {
    const fonteUsada = negrito ? fonteNegrito : fonte;
    const palavras = texto.split(" ");
    const linhas: string[] = [];
    let atual = "";
    for (const palavra of palavras) {
      const teste = atual ? `${atual} ${palavra}` : palavra;
      if (fonteUsada.widthOfTextAtSize(teste, tamanho) > larguraMax && atual) {
        linhas.push(atual);
        atual = palavra;
      } else {
        atual = teste;
      }
    }
    if (atual) linhas.push(atual);
    return linhas;
  }

  function tituloSecao(texto: string) {
    garantirEspaco(26);
    y -= 4;
    pagina.drawRectangle({ x: MARGEM, y: y - 16, width: LARGURA_UTIL, height: 18, color: CINZA_CLARO });
    pagina.drawText(texto.toUpperCase(), {
      x: MARGEM + 6,
      y: y - 12,
      size: 9.5,
      font: fonteNegrito,
      color: AZUL_NAVY,
    });
    y -= 26;
  }

  /** Duas colunas label:valor por linha. */
  function linhaCampos(campos: { label: string; valor: string }[]) {
    garantirEspaco(15);
    const larguraCol = LARGURA_UTIL / campos.length;
    campos.forEach((c, i) => {
      const x = MARGEM + i * larguraCol;
      pagina.drawText(`${c.label}: `, { x, y, size: 8.5, font: fonteNegrito, color: CINZA });
      const larguraLabel = fonteNegrito.widthOfTextAtSize(`${c.label}: `, 8.5);
      const valorTrunc = c.valor;
      pagina.drawText(valorTrunc, {
        x: x + larguraLabel,
        y,
        size: 9,
        font: fonte,
        color: PRETO,
        maxWidth: larguraCol - larguraLabel - 6,
      });
    });
    y -= 17;
  }

  function blocoTexto(label: string, texto: string) {
    garantirEspaco(13);
    pagina.drawText(`${label}:`, { x: MARGEM, y, size: 8.5, font: fonteNegrito, color: CINZA });
    y -= 12;
    const linhas = quebrarLinhas(texto, 9, LARGURA_UTIL);
    for (const l of linhas) {
      garantirEspaco(11);
      pagina.drawText(l, { x: MARGEM, y, size: 9, font: fonte, color: PRETO });
      y -= 11;
    }
    y -= 6;
  }

  // ---- Cabeçalho ----
  pagina.drawText("ESCOLA CDA", { x: MARGEM, y, size: 16, font: fonteNegrito, color: AZUL_NAVY });
  y -= 14;
  pagina.drawText("Onde, há 15 anos, família e escola sonham juntas", { x: MARGEM, y, size: 9, font: fonte, color: CINZA });
  y -= 22;
  pagina.drawText(`FICHA DE MATRÍCULA ${d.anoLetivo}`, { x: MARGEM, y, size: 12.5, font: fonteNegrito, color: PRETO });
  y -= 22;

  // ---- Dados do aluno ----
  tituloSecao("Dados do aluno");
  linhaCampos([
    { label: "Data de ingresso/renovação", valor: formatarData(d.dataIngresso) },
    { label: "Turno", valor: d.turnoLabel },
  ]);
  linhaCampos([
    { label: "Nome completo", valor: d.alunoNome },
  ]);
  linhaCampos([
    { label: "Data de nascimento", valor: formatarData(d.alunoDataNascimento) },
    { label: "Idade", valor: calcularIdade(d.alunoDataNascimento, new Date()) },
    { label: "Sexo", valor: naoInf(d.sexoLabel) },
  ]);
  linhaCampos([
    { label: "CPF", valor: d.alunoCpf ? formatarCPF(d.alunoCpf) : "Não informado" },
    { label: "Raça/etnia", valor: naoInf(d.racaCorLabel) },
    { label: "Autoriza uso de imagem", valor: d.autorizacaoImagem ? "Sim" : "Não" },
  ]);

  // ---- Pai / Mãe ----
  function secaoResponsavel(rotulo: "Pai" | "Mãe", r: DadosResponsavelFicha) {
    tituloSecao(`Filiação — ${rotulo}`);
    if (!r) {
      garantirEspaco(12);
      pagina.drawText("Não informado", { x: MARGEM, y, size: 9, font: fonte, color: CINZA });
      y -= 17;
      return;
    }
    linhaCampos([
      { label: "Nome", valor: r.nome },
      { label: "RG", valor: naoInf(r.rg) },
    ]);
    linhaCampos([
      { label: "CPF", valor: r.cpf ? formatarCPF(r.cpf) : "Não informado" },
      { label: "E-mail", valor: naoInf(r.email) },
    ]);
    linhaCampos([
      { label: "Escolaridade", valor: naoInf(r.escolaridade) },
      { label: "Profissão", valor: naoInf(r.profissao) },
    ]);
    linhaCampos([
      { label: "Endereço", valor: naoInf(r.endereco) },
      { label: "CEP", valor: naoInf(r.cep) },
    ]);
    linhaCampos([
      { label: "Tel. fixo", valor: r.telefoneFixo ? formatarTelefone(r.telefoneFixo) : "Não informado" },
      { label: "Celular", valor: r.telefoneCelular ? formatarTelefone(r.telefoneCelular) : "Não informado" },
      { label: "Tel. comercial", valor: r.telefoneComercial ? formatarTelefone(r.telefoneComercial) : "Não informado" },
    ]);
  }
  secaoResponsavel("Pai", d.pai);
  secaoResponsavel("Mãe", d.mae);

  // ---- Perfil da criança ----
  tituloSecao("Perfil da criança");
  linhaCampos([
    { label: "Tem irmãos?", valor: simNao(d.temIrmaos) },
    { label: "Idades", valor: naoInf(d.idadesIrmaos) },
  ]);
  linhaCampos([
    { label: "Usa bico?", valor: simNao(d.usaBico) },
    { label: "Usa mamadeira?", valor: simNao(d.usaMamadeira) },
  ]);
  if (d.obsBicoMamadeira) blocoTexto("Observações (bico/mamadeira)", d.obsBicoMamadeira);
  linhaCampos([
    { label: "Já frequentou outra escola?", valor: simNao(d.jaFrequentouEscola) },
    { label: "Duração", valor: naoInf(d.duracaoEscolaAnterior) },
  ]);
  blocoTexto("Problemas de saúde / alergias / medicação", d.obsSaude || "Nenhum informado");
  if (d.rotinaSonoAlimentacao) blocoTexto("Rotina de sono e alimentação", d.rotinaSonoAlimentacao);
  if (d.brincadeirasPrediletas) blocoTexto("Brincadeiras prediletas", d.brincadeirasPrediletas);
  if (d.reacoesContrariado) blocoTexto("Reações quando contrariado(a)", d.reacoesContrariado);

  // ---- Pessoas autorizadas a buscar ----
  tituloSecao("Pessoas autorizadas a buscar o aluno");
  const autorizados = [
    ...(d.pai ? [{ nome: d.pai.nome, parentesco: "Pai" }] : []),
    ...(d.mae ? [{ nome: d.mae.nome, parentesco: "Mãe" }] : []),
    ...d.pessoasAutorizadas,
  ];
  if (autorizados.length === 0) {
    garantirEspaco(12);
    pagina.drawText("Nenhuma pessoa informada", { x: MARGEM, y, size: 9, font: fonte, color: CINZA });
    y -= 17;
  } else {
    for (const p of autorizados) {
      garantirEspaco(13);
      pagina.drawText(`• ${p.nome}`, { x: MARGEM, y, size: 9, font: fonte, color: PRETO });
      pagina.drawText(`(${p.parentesco})`, { x: MARGEM + 300, y, size: 9, font: fonte, color: CINZA });
      y -= 14;
    }
  }

  // ---- Declaração e assinatura ----
  y -= 12;
  garantirEspaco(13);
  const declaracao =
    "Declaro que as informações prestadas nesta ficha são verdadeiras e me responsabilizo por comunicar " +
    "à Escola CDA qualquer alteração nos dados acima. Solicito a matrícula do(a) aluno(a) e declaro estar " +
    "ciente do Regimento Interno da instituição.";
  for (const l of quebrarLinhas(declaracao, 9.5, LARGURA_UTIL)) {
    garantirEspaco(13);
    pagina.drawText(l, { x: MARGEM, y, size: 9.5, font: fonte, color: PRETO });
    y -= 13;
  }
  y -= 26;

  garantirEspaco(60);
  pagina.drawText(`Santa Maria - RS, ${formatarData(new Date())}.`, { x: MARGEM, y, size: 9.5, font: fonte, color: PRETO });
  y -= 42;
  garantirEspaco(24);
  pagina.drawText("_____________________________________", { x: MARGEM, y, size: 10, font: fonte });
  y -= 12;
  pagina.drawText("Assinatura do(a) responsável", { x: MARGEM, y, size: 8.5, font: fonte, color: CINZA });

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}
