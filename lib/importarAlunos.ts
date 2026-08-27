import ExcelJS from "exceljs";

/** Importação de planilha de alunos — lê um .xlsx qualquer, tenta reconhecer as
 * colunas por nome (sem depender de um layout fixo) e monta uma lista de
 * alterações propostas (mensalidade, telefone/CPF/endereço do responsável)
 * comparando com o que já está cadastrado. Nada é gravado sem confirmação —
 * ver app/api/alunos/importar/route.ts (pré-visualização) e
 * app/api/alunos/importar/confirmar/route.ts (aplica só o que foi marcado). */

const TAMANHO_MAX_BYTES = 5 * 1024 * 1024;

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

function celulaParaTexto(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return "";
  if (valor instanceof Date) return valor.toLocaleDateString("pt-BR");
  if (typeof valor === "object") {
    if ("richText" in valor) return valor.richText.map((r) => r.text).join("");
    if ("result" in valor) return String(valor.result ?? "");
    if ("text" in valor) return String((valor as { text: unknown }).text ?? "");
  }
  return String(valor).trim();
}

export async function parsarPlanilha(buffer: Buffer): Promise<{ headers: string[]; linhas: Record<string, string>[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const planilha = workbook.worksheets[0];
  if (!planilha) return { headers: [], linhas: [] };

  const headerRow = planilha.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = celulaParaTexto(cell.value);
  });

  const linhas: Record<string, string>[] = [];
  for (let i = 2; i <= planilha.rowCount; i++) {
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
    if (!achado) achado = normalizados.find((h) => aliases.some((a) => h.norm.includes(a)));
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
