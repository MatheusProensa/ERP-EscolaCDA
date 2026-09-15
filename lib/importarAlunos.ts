import { validarPlanilhaDataUri, parsarPlanilha as parsarPlanilhaGenerico, detectarColunasGenerico, normalizarTexto } from "./planilha";

export { validarPlanilhaDataUri, normalizarTexto };

/** Importação de planilha de alunos — lê um .xlsx qualquer, tenta reconhecer as
 * colunas por nome (sem depender de um layout fixo) e monta uma lista de
 * alterações propostas (mensalidade, telefone/CPF/endereço do responsável)
 * comparando com o que já está cadastrado. Nada é gravado sem confirmação —
 * ver app/api/alunos/importar/route.ts (pré-visualização) e
 * app/api/alunos/importar/confirmar/route.ts (aplica só o que foi marcado).
 * A leitura genérica do .xlsx (achar cabeçalho, ler célula, fórmula do Google
 * Sheets) mora em lib/planilha.ts — compartilhada com Funcionários e
 * Interessados (out/2026, pedido do dono: mesmo padrão nos 3). */

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

const ALIASES_TODOS = Object.values(CAMPOS_CONHECIDOS).flat() as string[];

export async function parsarPlanilha(buffer: Buffer): Promise<{ headers: string[]; linhas: Record<string, string>[] }> {
  return parsarPlanilhaGenerico(buffer, ALIASES_TODOS);
}

export function detectarColunas(headers: string[]): Record<CampoConhecido, string | null> {
  return detectarColunasGenerico(headers, CAMPOS_CONHECIDOS);
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
