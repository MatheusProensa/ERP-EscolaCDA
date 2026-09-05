import ExcelJS from "exceljs";
import { validarPlanilhaDataUri } from "./planilha";

export { validarPlanilhaDataUri };

/** Importação de planilha de alunos — lê um .xlsx qualquer, tenta reconhecer as
 * colunas por nome (sem depender de um layout fixo) e monta uma lista de
 * alterações propostas (mensalidade, telefone/CPF/endereço do responsável)
 * comparando com o que já está cadastrado. Nada é gravado sem confirmação —
 * ver app/api/alunos/importar/route.ts (pré-visualização) e
 * app/api/alunos/importar/confirmar/route.ts (aplica só o que foi marcado). */

export function normalizarTexto(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Campos que o importador sabe reconhecer, com os nomes de coluna mais comuns
 * que uma planilha de escola costuma usar (já normalizados na comparação). */
export const CAMPOS_CONHECIDOS = {
  nome: ["nome", "aluno", "nome do aluno", "nome aluno", "nome completo"],
  turma: ["turma", "turma atual", "sala"],
  mensalidade: ["mensalidade", "valor mensalidade", "valor da mensalidade", "valor", "valor contratado"],
  responsavelNome: ["responsavel", "nome do responsavel", "nome responsavel", "responsavel financeiro"],
  cpf: ["cpf", "cpf responsavel", "cpf do responsavel"],
  telefone: ["telefone", "celular", "contato", "whatsapp", "telefone responsavel"],
  endereco: ["endereco", "endereco completo"],
  email: ["email", "e mail"],
} as const;

export type CampoConhecido = keyof typeof CAMPOS_CONHECIDOS;

/** Google Sheets, ao exportar pra .xlsx, embute fórmulas que o Excel não sabe
 * computar (IMPORTRANGE, FILTER pra outra aba, etc.) sem valor em cache — mas
 * deixa o último valor conhecido como fallback dentro de
 * IFERROR(..., "valor") / IFERROR(..., 123.45). Extrai esse literal do fim
 * da fórmula quando não há um `result` aproveitável. */
function extrairFallbackFormula(formula: string): string | null {
  const strMatch = formula.match(/,\s*"((?:[^"\\]|\\.)*)"\s*\)\s*$/);
  if (strMatch) return strMatch[1].replace(/\\"/g, '"');
  const numMatch = formula.match(/,\s*(-?\d+(?:\.\d+)?)\s*\)\s*$/);
  if (numMatch) return numMatch[1];
  return null;
}

function celulaParaTexto(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return "";
  // timeZone: "UTC" (não América/Sao_Paulo) — datas de planilha (ex.: nascimento)
  // não têm hora de verdade, o ExcelJS já entrega como meia-noite UTC. Formatar
  // em fuso negativo voltaria um dia (mesmo bug do formatarData em lib/utils.ts,
  // só que na direção oposta ao "Gerado em" de timestamp real).
  if (valor instanceof Date) return isNaN(valor.getTime()) ? "" : valor.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  if (typeof valor === "object") {
    if ("richText" in valor) return valor.richText.map((r) => r.text).join("");
    if ("formula" in valor) {
      const f = valor as { formula?: string; result?: ExcelJS.CellValue };
      const resultadoInvalido =
        f.result === null ||
        f.result === undefined ||
        (f.result instanceof Date && isNaN(f.result.getTime()));
      if (!resultadoInvalido) return celulaParaTexto(f.result as ExcelJS.CellValue);
      // Célula formatada como data mas cujo resultado real é outra coisa (texto) vira
      // "Invalid Date" no ExcelJS — mesmo caso do result ausente/nulo: cai pro fallback.
      return f.formula ? (extrairFallbackFormula(f.formula) ?? "") : "";
    }
    if ("result" in valor) return celulaParaTexto((valor as { result: ExcelJS.CellValue }).result);
    if ("text" in valor) return String((valor as { text: unknown }).text ?? "");
  }
  return String(valor).trim();
}

const ALIASES_TODOS = Object.values(CAMPOS_CONHECIDOS).flat() as string[];

/** Muita planilha de escola tem 1-2 linhas de filtro/busca ("Pesquisar por...")
 * antes do cabeçalho de verdade — em vez de assumir que é sempre a linha 1,
 * varre as primeiras linhas e fica com a que mais parece um cabeçalho
 * (mais células batendo com os nomes de campo conhecidos). */
function encontrarLinhaCabecalho(planilha: ExcelJS.Worksheet): number {
  const limite = Math.min(15, planilha.rowCount);
  let melhorLinha = 1;
  let melhorPontuacao = -1;
  for (let i = 1; i <= limite; i++) {
    const row = planilha.getRow(i);
    let pontuacao = 0;
    row.eachCell({ includeEmpty: false }, (cell) => {
      const texto = normalizarTexto(celulaParaTexto(cell.value));
      if (texto && ALIASES_TODOS.some((a) => texto === a || texto.includes(a))) pontuacao++;
    });
    if (pontuacao > melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhorLinha = i;
    }
  }
  return melhorLinha;
}

export async function parsarPlanilha(buffer: Buffer): Promise<{ headers: string[]; linhas: Record<string, string>[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const planilha = workbook.worksheets[0];
  if (!planilha) return { headers: [], linhas: [] };

  const linhaCabecalho = encontrarLinhaCabecalho(planilha);
  const headerRow = planilha.getRow(linhaCabecalho);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = celulaParaTexto(cell.value);
  });

  const linhas: Record<string, string>[] = [];
  for (let i = linhaCabecalho + 1; i <= planilha.rowCount; i++) {
    const row = planilha.getRow(i);
    if (row.cellCount === 0) continue;
    const linha: Record<string, string> = {};
    let temConteudo = false;
    headers.forEach((h, idx) => {
      if (!h) return;
      const texto = celulaParaTexto(row.getCell(idx + 1).value);
      linha[h] = texto;
      if (texto) temConteudo = true;
    });
    if (temConteudo) linhas.push(linha);
  }

  return { headers, linhas };
}

/** Casa cada coluna conhecida com a coluna da planilha cujo nome (normalizado)
 * mais se parece — primeiro tenta igualdade exata, depois "contém". */
export function detectarColunas(headers: string[]): Record<CampoConhecido, string | null> {
  const normalizados = headers.map((h) => ({ original: h, norm: normalizarTexto(h) }));
  const resultado = {} as Record<CampoConhecido, string | null>;

  for (const campo of Object.keys(CAMPOS_CONHECIDOS) as CampoConhecido[]) {
    const aliases: readonly string[] = CAMPOS_CONHECIDOS[campo];
    let achado = normalizados.find((h) => aliases.includes(h.norm));
    if (!achado) {
      // Várias colunas podem "conter" o alias (ex.: planilhas de escola costumam ter
      // "Mensalidade" — a atual — e "Mensalidade 2027" — reajuste da renovação, lado a
      // lado). Entre os candidatos, fica com o nome de coluna mais curto/mais parecido
      // com o alias puro, não o primeiro que aparecer.
      const candidatos = normalizados.filter((h) => aliases.some((a) => h.norm.includes(a)));
      achado = candidatos.sort((a, b) => a.norm.length - b.norm.length)[0];
    }
    resultado[campo] = achado?.original ?? null;
  }
  return resultado;
}

/** "R$ 1.250,50" / "1250,50" / "1250.50" → 1250.5 */
export function parsarValorMonetario(texto: string): number | null {
  const limpo = texto.replace(/[^\d,.-]/g, "").trim();
  if (!limpo) return null;
  let normalizado = limpo;
  if (limpo.includes(",") && limpo.includes(".")) {
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else if (limpo.includes(",")) {
    normalizado = limpo.replace(",", ".");
  }
  const num = Number(normalizado);
  return Number.isFinite(num) ? num : null;
}

export type DiffMatricula = {
  id: string;
  tipo: "matricula";
  matriculaId: string;
  alunoNome: string;
  campo: "valorMensalidade";
  atual: number | null;
  novo: number;
};

export type DiffResponsavel = {
  id: string;
  tipo: "responsavel";
  responsavelId: string;
  alunoNome: string;
  campo: "telefone" | "cpf" | "endereco" | "email";
  atual: string | null;
  novo: string;
};

export type Diff = DiffMatricula | DiffResponsavel;

type AlunoParaImportacao = {
  id: string;
  nome: string;
  matriculas: { id: string; situacao: string; valorMensalidade: number | null; turma: { nome: string } }[];
  responsaveis: { id: string; telefone: string; cpf: string | null; endereco: string | null; email: string | null }[];
};

export function construirDiffs(
  alunosDb: AlunoParaImportacao[],
  linhas: Record<string, string>[],
  colunas: Record<CampoConhecido, string | null>
): { diffs: Diff[]; naoEncontrados: string[]; ambiguos: string[] } {
  const porNome = new Map<string, AlunoParaImportacao>();
  for (const a of alunosDb) porNome.set(normalizarTexto(a.nome), a);

  const diffs: Diff[] = [];
  const naoEncontrados: string[] = [];
  const ambiguos: string[] = [];

  for (const linha of linhas) {
    const nomeCol = colunas.nome;
    const nomePlanilha = nomeCol ? linha[nomeCol] : "";
    if (!nomePlanilha) continue;

    const aluno = porNome.get(normalizarTexto(nomePlanilha));
    if (!aluno) {
      naoEncontrados.push(nomePlanilha);
      continue;
    }

    // Mensalidade — só aplica se der pra saber, sem ambiguidade, qual matrícula ativa é a certa.
    if (colunas.mensalidade) {
      const bruto = linha[colunas.mensalidade];
      const novoValor = bruto ? parsarValorMonetario(bruto) : null;
      if (novoValor !== null && novoValor > 0) {
        const ativas = aluno.matriculas.filter((m) => m.situacao === "ATIVA");
        let alvo: AlunoParaImportacao["matriculas"][number] | null = ativas[0] ?? null;
        if (ativas.length > 1) {
          const turmaPlanilha = colunas.turma ? normalizarTexto(linha[colunas.turma]) : "";
          const porTurma = turmaPlanilha ? ativas.find((m) => normalizarTexto(m.turma.nome).includes(turmaPlanilha)) : null;
          if (porTurma) alvo = porTurma;
          else {
            ambiguos.push(`${aluno.nome} (${ativas.length} matrículas ativas — indique a turma na planilha)`);
            alvo = null;
          }
        }
        if (alvo && novoValor !== alvo.valorMensalidade) {
          diffs.push({
            id: `matricula-${alvo.id}-valorMensalidade`,
            tipo: "matricula",
            matriculaId: alvo.id,
            alunoNome: aluno.nome,
            campo: "valorMensalidade",
            atual: alvo.valorMensalidade,
            novo: novoValor,
          });
        }
      }
    }

    // Responsável — atualiza o primeiro cadastrado (não cria responsável novo).
    const responsavel = aluno.responsaveis[0];
    if (responsavel) {
      const camposResp: { campo: DiffResponsavel["campo"]; coluna: string | null }[] = [
        { campo: "telefone", coluna: colunas.telefone },
        { campo: "cpf", coluna: colunas.cpf },
        { campo: "endereco", coluna: colunas.endereco },
        { campo: "email", coluna: colunas.email },
      ];
      for (const { campo, coluna } of camposResp) {
        if (!coluna) continue;
        const novo = linha[coluna]?.trim();
        if (!novo) continue;
        const atual = responsavel[campo] ?? null;
        if (normalizarTexto(novo) !== normalizarTexto(atual)) {
          diffs.push({
            id: `responsavel-${responsavel.id}-${campo}`,
            tipo: "responsavel",
            responsavelId: responsavel.id,
            alunoNome: aluno.nome,
            campo,
            atual,
            novo,
          });
        }
      }
    }
  }

  return { diffs, naoEncontrados, ambiguos };
}
