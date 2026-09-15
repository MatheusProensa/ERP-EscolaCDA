import ExcelJS from "exceljs";

const TAMANHO_MAX_BYTES = 5 * 1024 * 1024;

/** Validação compartilhada de upload de planilha .xlsx (data URI base64) —
 * usada pelos importadores de Alunos, Ponto, Funcionários e Interessados. */
export function validarPlanilhaDataUri(dataUri: unknown): { ok: true; buffer: Buffer } | { ok: false; erro: string } {
  if (typeof dataUri !== "string") return { ok: false, erro: "Arquivo inválido" };
  const match = dataUri.match(/^data:([^;]*);base64,(.+)$/);
  if (!match) return { ok: false, erro: "Formato de arquivo inválido" };

  const [, , base64] = match;
  const tamanhoBytes = Math.floor((base64.length * 3) / 4);
  if (tamanhoBytes > TAMANHO_MAX_BYTES) return { ok: false, erro: "Arquivo maior que 5MB" };

  const buffer = Buffer.from(base64, "base64");
  // .xlsx é um ZIP (assinatura "PK") — checagem simples antes de gastar tempo tentando abrir.
  if (buffer.length < 2 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    return { ok: false, erro: "O arquivo não parece ser uma planilha .xlsx válida." };
  }
  return { ok: true, buffer };
}

/** Lógica GENÉRICA de leitura de planilha — extraída de lib/importarAlunos.ts
 * (out/2026, pedido do dono: "leva o mesmo padrão pra Funcionários e
 * Interessados") pra virar a base comum dos 3 importadores + o de Ponto.
 * Cada importador (Alunos/Funcionários/Interessados) só entra com a SUA
 * lista de campos conhecidos (nomes de coluna que sabe reconhecer); o
 * parsing do arquivo em si (achar o cabeçalho, ler célula por célula,
 * lidar com fórmula do Google Sheets) é o mesmo pros 3. */

export function normalizarTexto(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

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

export function celulaParaTexto(valor: ExcelJS.CellValue): string {
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

/** Muita planilha de escola tem 1-2 linhas de filtro/busca ("Pesquisar por...")
 * antes do cabeçalho de verdade — em vez de assumir que é sempre a linha 1,
 * varre as primeiras linhas e fica com a que mais parece um cabeçalho (mais
 * células batendo com os nomes de campo conhecidos daquele importador). */
function encontrarLinhaCabecalho(planilha: ExcelJS.Worksheet, aliasesConhecidos: string[]): number {
  const limite = Math.min(15, planilha.rowCount);
  let melhorLinha = 1;
  let melhorPontuacao = -1;
  for (let i = 1; i <= limite; i++) {
    const row = planilha.getRow(i);
    let pontuacao = 0;
    row.eachCell({ includeEmpty: false }, (cell) => {
      const texto = normalizarTexto(celulaParaTexto(cell.value));
      if (texto && aliasesConhecidos.some((a) => texto === a || texto.includes(a))) pontuacao++;
    });
    if (pontuacao > melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhorLinha = i;
    }
  }
  return melhorLinha;
}

/** Lê a 1ª aba do .xlsx e devolve cabeçalhos + linhas como texto puro.
 * `aliasesConhecidos` é a lista achatada de nomes de coluna que ESSE
 * importador reconhece (ex.: todos os aliases de CAMPOS_CONHECIDOS de
 * Aluno/Funcionário/Interessado) — só usada pra achar a linha certa do
 * cabeçalho quando a planilha tem linhas extras antes dele. */
export async function parsarPlanilha(buffer: Buffer, aliasesConhecidos: string[]): Promise<{ headers: string[]; linhas: Record<string, string>[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const planilha = workbook.worksheets[0];
  if (!planilha) return { headers: [], linhas: [] };

  const linhaCabecalho = encontrarLinhaCabecalho(planilha, aliasesConhecidos);
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

/** Casa cada campo conhecido de um importador (ex.: CAMPOS_CONHECIDOS de
 * Aluno/Funcionário/Interessado) com a coluna da planilha cujo nome
 * (normalizado) mais se parece — primeiro tenta igualdade exata, depois
 * "contém". Genérico sobre o tipo de campo (`T`) pra servir aos 3
 * importadores sem repetir essa lógica de casamento em cada um. */
export function detectarColunasGenerico<T extends string>(
  headers: string[],
  camposConhecidos: Record<T, readonly string[]>
): Record<T, string | null> {
  const normalizados = headers.map((h) => ({ original: h, norm: normalizarTexto(h) }));
  const resultado = {} as Record<T, string | null>;

  for (const campo of Object.keys(camposConhecidos) as T[]) {
    const aliases = camposConhecidos[campo];
    let achado = normalizados.find((h) => aliases.includes(h.norm));
    if (!achado) {
      // Várias colunas podem "conter" o alias (ex.: "Mensalidade" — a atual —
      // e "Mensalidade 2027" — reajuste da renovação, lado a lado). Entre os
      // candidatos, fica com o nome de coluna mais curto/mais parecido com o
      // alias puro, não o primeiro que aparecer.
      const candidatos = normalizados.filter((h) => aliases.some((a) => h.norm.includes(a)));
      achado = candidatos.sort((a, b) => a.norm.length - b.norm.length)[0];
    }
    resultado[campo] = achado?.original ?? null;
  }
  return resultado;
}
