import JSZip from "jszip";

/**
 * Importação de Ficha de Matrícula (.docx) — o modelo que a escola usa hoje
 * já foi feito com os mesmos campos que o cadastro de Aluno/Responsável tem
 * (raça/cor, filiação, usa bico, autorização de imagem etc.), então dá pra
 * extrair o texto de cada parágrafo do Word e casar direto com o schema —
 * sem OCR, é texto de verdade dentro do .docx.
 *
 * Limitação conhecida: se algum campo do modelo usar uma caixinha de marcar
 * "de verdade" do Word (controle de conteúdo), em vez de a pessoa digitar
 * "(X)" na frente da opção, o estado dela não aparece como texto simples e
 * o campo fica sem valor — mais seguro do que adivinhar errado.
 */

export type ResponsavelFicha = {
  nome: string;
  parentesco: "Pai" | "Mãe";
  cpf: string | null;
  rg: string | null;
  email: string | null;
  escolaridade: string | null;
  profissao: string | null;
  endereco: string | null;
  cep: string | null;
  telefoneFixo: string | null;
  telefone: string | null;
  telefoneComercial: string | null;
  autorizado: boolean;
};

export type ResultadoFicha = {
  nome: string | null;
  dataNascimento: string | null; // yyyy-mm-dd
  cpf: string | null;
  sexo: "M" | "F" | null;
  racaCor: "BRANCA" | "PRETA" | "PARDA" | "AMARELA" | "INDIGENA" | "NAO_DECLARADA" | null;
  turno: "TARDE" | "MANHA" | null; // Tarde = ensino regular, Contraturno = MANHA
  dataMatricula: string | null;
  autorizacaoImagem: boolean;
  temIrmaos: boolean | null;
  idadesIrmaos: string | null;
  usaBico: boolean | null;
  usaMamadeira: boolean | null;
  jaFrequentouEscola: boolean | null;
  duracaoEscolaAnterior: string | null;
  rotinaSonoAlimentacao: string | null;
  brincadeirasPrediletas: string | null;
  reacoesContrariado: string | null;
  necessidadesEsp: string | null;
  responsaveis: ResponsavelFicha[];
  pessoasAutorizadas: { nome: string; parentesco: string }[];
  /** Campos que o parser não conseguiu achar/entender — não impede a
   * criação, só avisa o que precisa ser conferido/completado à mão depois. */
  avisos: string[];
};

function limparEspacos(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Acha as opções marcadas com "(X)" (com qualquer variação de espaço dentro
 * dos parênteses) numa linha com várias opções tipo "(X) Tarde  ( ) Contraturno". */
function opcoesMarcadas(texto: string): string[] {
  const marcadas: string[] = [];
  const regex = /\(\s*[Xx]\s*\)\s*([^(]+?)(?=\s*\(|$)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(texto))) {
    marcadas.push(limparEspacos(m[1]));
  }
  return marcadas;
}

function valorDepoisDoRotulo(texto: string, rotulo: string): string | null {
  const i = texto.indexOf(rotulo);
  if (i < 0) return null;
  const resto = texto.slice(i + rotulo.length);
  // Corta no próximo rótulo conhecido (linhas com dois rótulos, ex.: "Tel. Fixo: ( )Celular: ...")
  // ou no fim da linha — como já trabalhamos parágrafo a parágrafo, o "resto" já é só até o fim do parágrafo.
  return limparEspacos(resto);
}

function extrairDataDDMMYYYY(texto: string): string | null {
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(texto);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

const RACA_MAP: Record<string, ResultadoFicha["racaCor"]> = {
  branca: "BRANCA",
  preta: "PRETA",
  parda: "PARDA",
  amarela: "AMARELA",
  "indígena": "INDIGENA",
  indigena: "INDIGENA",
  "n.d.": "NAO_DECLARADA",
  nd: "NAO_DECLARADA",
};

async function extrairParagrafos(buffer: Buffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(buffer);
  const arquivoXml = zip.file("word/document.xml");
  if (!arquivoXml) throw new Error("Não achei word/document.xml — não parece ser um .docx válido.");
  const xml = await arquivoXml.async("text");

  return xml
    .split(/<\/w:p>/)
    .map((p) =>
      limparEspacos(
        p
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
      )
    )
    .filter((p) => p.length > 0);
}

export async function parsarFichaMatricula(buffer: Buffer): Promise<ResultadoFicha> {
  const paragrafos = await extrairParagrafos(buffer);
  const avisos: string[] = [];

  const resultado: ResultadoFicha = {
    nome: null,
    dataNascimento: null,
    cpf: null,
    sexo: null,
    racaCor: null,
    turno: null,
    dataMatricula: null,
    autorizacaoImagem: false,
    temIrmaos: null,
    idadesIrmaos: null,
    usaBico: null,
    usaMamadeira: null,
    jaFrequentouEscola: null,
    duracaoEscolaAnterior: null,
    rotinaSonoAlimentacao: null,
    brincadeirasPrediletas: null,
    reacoesContrariado: null,
    necessidadesEsp: null,
    responsaveis: [],
    pessoasAutorizadas: [],
    avisos,
  };

  let contexto: "aluno" | "pai" | "mae" = "aluno";
  let pai: ResponsavelFicha | null = null;
  let mae: ResponsavelFicha | null = null;
  const pessoaVazia = (parentesco: "Pai" | "Mãe", nome: string): ResponsavelFicha => ({
    nome,
    parentesco,
    cpf: null,
    rg: null,
    email: null,
    escolaridade: null,
    profissao: null,
    endereco: null,
    cep: null,
    telefoneFixo: null,
    telefone: null,
    telefoneComercial: null,
    autorizado: true,
  });

  function alvoAtual(): ResponsavelFicha | null {
    if (contexto === "pai") return pai;
    if (contexto === "mae") return mae;
    return null;
  }

  for (const p of paragrafos) {
    if (p.startsWith("Data de ingresso") || p.startsWith("Data de matr")) {
      resultado.dataMatricula = extrairDataDDMMYYYY(p);
    } else if (p.startsWith("Turno:")) {
      const marcadas = opcoesMarcadas(p).map((o) => o.toLowerCase());
      if (marcadas.some((o) => o.includes("tarde"))) resultado.turno = "TARDE";
      else if (marcadas.some((o) => o.includes("contraturno"))) resultado.turno = "MANHA";
    } else if (p.startsWith("Data de Nascimento:")) {
      resultado.dataNascimento = extrairDataDDMMYYYY(p);
    } else if (p.startsWith("Sexo:")) {
      const marcadas = opcoesMarcadas(p).map((o) => o.toLowerCase());
      if (marcadas.some((o) => o.startsWith("masculino"))) resultado.sexo = "M";
      else if (marcadas.some((o) => o.startsWith("feminino"))) resultado.sexo = "F";
    } else if (p.startsWith("Nome completo:")) {
      resultado.nome = valorDepoisDoRotulo(p, "Nome completo:");
    } else if (p.startsWith("Ra") && p.includes("a/etnia:")) {
      const marcadas = opcoesMarcadas(p).map((o) => o.toLowerCase().replace(/\.$/, ""));
      const achada = marcadas.find((o) => RACA_MAP[o]);
      resultado.racaCor = achada ? RACA_MAP[achada] : null;
    } else if (p.startsWith("Nome do Pai:")) {
      contexto = "pai";
      pai = pessoaVazia("Pai", valorDepoisDoRotulo(p, "Nome do Pai:") ?? "");
    } else if (p.startsWith("Nome da M") && p.includes("e:")) {
      contexto = "mae";
      mae = pessoaVazia("Mãe", valorDepoisDoRotulo(p, p.slice(0, p.indexOf(":") + 1)) ?? "");
    } else if (p.startsWith("CPF:")) {
      const valor = valorDepoisDoRotulo(p, "CPF:");
      if (contexto === "aluno") resultado.cpf = valor;
      else if (alvoAtual()) alvoAtual()!.cpf = valor;
    } else if (p.startsWith("RG:")) {
      const valor = valorDepoisDoRotulo(p, "RG:");
      if (alvoAtual()) alvoAtual()!.rg = valor;
    } else if (p.startsWith("E-mail:")) {
      const valor = valorDepoisDoRotulo(p, "E-mail:");
      if (alvoAtual()) alvoAtual()!.email = valor || null;
    } else if (p.startsWith("Escolaridade:")) {
      const valor = valorDepoisDoRotulo(p, "Escolaridade:");
      if (alvoAtual()) alvoAtual()!.escolaridade = valor || null;
    } else if (p.startsWith("Profiss")) {
      const rotulo = p.slice(0, p.indexOf(":") + 1);
      const valor = valorDepoisDoRotulo(p, rotulo);
      if (alvoAtual()) alvoAtual()!.profissao = valor || null;
    } else if (p.startsWith("Endere")) {
      const rotulo = p.slice(0, p.indexOf(":") + 1);
      const valor = valorDepoisDoRotulo(p, rotulo);
      if (alvoAtual()) alvoAtual()!.endereco = valor || null;
    } else if (p.startsWith("CEP:")) {
      const valor = valorDepoisDoRotulo(p, "CEP:");
      if (alvoAtual()) alvoAtual()!.cep = valor || null;
    } else if (p.startsWith("Tel. Fixo:")) {
      const valor = valorDepoisDoRotulo(p, "Tel. Fixo:");
      if (alvoAtual() && valor && !/^\(\s*\)$/.test(valor)) alvoAtual()!.telefoneFixo = valor;
    } else if (p.startsWith("Celular:")) {
      const valor = valorDepoisDoRotulo(p, "Celular:");
      if (alvoAtual() && valor && !/^\(\s*\)$/.test(valor)) alvoAtual()!.telefone = valor;
    } else if (p.startsWith("Tel. Comercial:")) {
      const valor = valorDepoisDoRotulo(p, "Tel. Comercial:");
      if (alvoAtual() && valor && !/^\(\s*\)$/.test(valor)) alvoAtual()!.telefoneComercial = valor;
    } else if (p.startsWith("Tem irm")) {
      const marcadas = opcoesMarcadas(p).map((o) => o.toLowerCase());
      resultado.temIrmaos = marcadas.some((o) => o.startsWith("sim"));
      const idades = /Idades respectivas:\s*(.*)$/i.exec(p);
      if (idades) resultado.idadesIrmaos = limparEspacos(idades[1]) || null;
    } else if (p.startsWith("Usa bico?")) {
      const antesMamadeira = p.split(/Usa mamadeira[?:]/i)[0];
      const depoisMamadeira = p.split(/Usa mamadeira[?:]/i)[1] ?? "";
      resultado.usaBico = opcoesMarcadas(antesMamadeira).some((o) => o.toLowerCase().startsWith("sim"));
      resultado.usaMamadeira = opcoesMarcadas(depoisMamadeira).some((o) => o.toLowerCase().startsWith("sim"));
    } else if (p.startsWith("J") && p.includes("frequentou outra escola")) {
      const marcadas = opcoesMarcadas(p).map((o) => o.toLowerCase());
      resultado.jaFrequentouEscola = marcadas.some((o) => o.startsWith("sim"));
      const duracao = /Dura[çc][ãa]o:\s*(.*)$/i.exec(p);
      if (duracao) resultado.duracaoEscolaAnterior = limparEspacos(duracao[1]) || null;
    } else if (p.includes("problema de sa") && p.includes("?")) {
      const obs = /Obs\.?:\s*(.*)$/i.exec(p);
      if (obs && limparEspacos(obs[1])) resultado.necessidadesEsp = limparEspacos(obs[1]);
    } else if (p.startsWith("Quest") && p.includes("sono")) {
      const rotulo = p.slice(0, p.indexOf(":") + 1);
      resultado.rotinaSonoAlimentacao = valorDepoisDoRotulo(p, rotulo) || null;
    } else if (p.startsWith("Brincadeiras prediletas:")) {
      resultado.brincadeirasPrediletas = valorDepoisDoRotulo(p, "Brincadeiras prediletas:") || null;
    } else if (p.startsWith("Rea") && p.includes("contrariado:")) {
      const rotulo = p.slice(0, p.indexOf(":") + 1);
      resultado.reacoesContrariado = valorDepoisDoRotulo(p, rotulo) || null;
    } else if (p.startsWith("Pessoas autorizadas a buscar")) {
      const marcadas = opcoesMarcadas(p).map((o) => o.toLowerCase());
      if (pai) pai.autorizado = marcadas.some((o) => o.startsWith("pai"));
      if (mae) mae.autorizado = marcadas.some((o) => o.includes("m") && o.includes("e"));
    } else if (/^\d\)\s*Nome:/.test(p)) {
      const nomeMatch = /Nome:\s*([^]*?)\s*Parentesco:/i.exec(p);
      const parentescoMatch = /Parentesco:\s*(.*)$/i.exec(p);
      const nome = nomeMatch ? limparEspacos(nomeMatch[1]) : "";
      const parentesco = parentescoMatch ? limparEspacos(parentescoMatch[1]) : "";
      if (nome) resultado.pessoasAutorizadas.push({ nome, parentesco: parentesco || "Não informado" });
    } else if (p.toLowerCase().includes("autorizo a utilizar a imagem")) {
      const marcadas = opcoesMarcadas(p).map((o) => o.toLowerCase());
      if (marcadas.some((o) => o.startsWith("sim"))) resultado.autorizacaoImagem = true;
      else if (!marcadas.some((o) => o.startsWith("n"))) {
        // Nem "Sim" nem "Não" foram reconhecidos como marcados — provavelmente é uma
        // caixinha de marcar "de verdade" do Word, que não vira texto "(X)" simples.
        avisos.push("Não deu pra confirmar a autorização de uso de imagem — confira e marque manualmente.");
      }
    }
  }

  if (pai) resultado.responsaveis.push(pai);
  if (mae) resultado.responsaveis.push(mae);

  if (!resultado.nome) avisos.push("Não achei o nome completo do aluno.");
  if (!resultado.dataNascimento) avisos.push("Não achei a data de nascimento.");
  if (!resultado.turno) avisos.push("Não achei o turno (Tarde/Contraturno) marcado.");
  if (resultado.responsaveis.length === 0) avisos.push("Não achei nenhum responsável (pai/mãe).");

  return resultado;
}
