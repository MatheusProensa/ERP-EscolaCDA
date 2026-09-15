import { validarPlanilhaDataUri, parsarPlanilha as parsarPlanilhaGenerico, detectarColunasGenerico, normalizarTexto } from "./planilha";

export { validarPlanilhaDataUri, normalizarTexto };

/** Importação de planilha de Funcionários — mesmo padrão da de Alunos
 * (lib/importarAlunos.ts), out/2026, pedido do dono. Casa por CPF (chave
 * única no schema): quem já existe entra como DIFF de atualização; quem não
 * bate com ninguém entra como proposta de CRIAÇÃO. Nada é gravado sem
 * confirmação — ver app/api/funcionarios/importar/route.ts (pré-visualização)
 * e .../confirmar/route.ts (aplica só o que foi marcado). */

export const CAMPOS_CONHECIDOS = {
  nome: ["nome", "funcionario", "nome do funcionario", "nome completo"],
  cpf: ["cpf"],
  cargo: ["cargo", "funcao", "função"],
  setor: ["setor", "departamento", "area", "área"],
  telefone: ["telefone", "celular", "contato", "whatsapp"],
  email: ["email", "e mail"],
  dataNascimento: ["nascimento", "data de nascimento", "data nascimento"],
  admissao: ["admissao", "data de admissao", "data admissao", "data de contratacao"],
} as const;

export type CampoConhecido = keyof typeof CAMPOS_CONHECIDOS;

const ALIASES_TODOS = Object.values(CAMPOS_CONHECIDOS).flat() as string[];

export async function parsarPlanilha(buffer: Buffer): Promise<{ headers: string[]; linhas: Record<string, string>[] }> {
  return parsarPlanilhaGenerico(buffer, ALIASES_TODOS);
}

export function detectarColunas(headers: string[]): Record<CampoConhecido, string | null> {
  return detectarColunasGenerico(headers, CAMPOS_CONHECIDOS);
}

/** "dd/mm/aaaa" (como o ExcelJS/celulaParaTexto formata uma data de planilha,
 * pt-BR) → Date em meia-noite UTC, mesma convenção de data pura usada em
 * Funcionario.dataNascimento/admissao. null se não bater com o formato. */
export function parsarDataBr(texto: string): Date | null {
  const m = texto.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, dia, mes, ano] = m;
  const data = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
  return isNaN(data.getTime()) ? null : data;
}

function apenasDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

export type DiffFuncionario = {
  id: string;
  tipo: "atualizar";
  funcionarioId: string;
  funcionarioNome: string;
  campo: "cargo" | "setor" | "telefone" | "email" | "dataNascimento" | "admissao";
  atual: string | null;
  novo: string;
};

export type NovoFuncionario = {
  id: string;
  tipo: "criar";
  nome: string;
  cpf: string | null;
  cargo: string;
  setor: string;
  telefone: string | null;
  email: string | null;
  dataNascimento: string | null;
  /** Sempre presente — linha sem admissão válida vira "incompleto", nunca
   * chega a virar proposta de criação (admissao não é opcional no schema). */
  admissao: string;
};

export type ItemFuncionario = DiffFuncionario | NovoFuncionario;

type FuncionarioParaImportacao = {
  id: string;
  nome: string;
  cpf: string | null;
  cargo: string;
  setor: string;
  telefone: string | null;
  email: string | null;
  dataNascimento: Date | null;
  admissao: Date;
};

function formatarDataParaComparar(d: Date | null): string {
  return d ? d.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "";
}

/** Monta a lista de DIFFs (funcionário já cadastrado, campo mudou) + de
 * CRIAÇÕES (linha da planilha sem CPF correspondente no sistema) — cargo e
 * setor são obrigatórios pro cadastro (ver schema), então uma linha sem
 * algum dos dois vira "incompleta" em vez de proposta de criação. */
export function construirItens(
  funcionariosDb: FuncionarioParaImportacao[],
  linhas: Record<string, string>[],
  colunas: Record<CampoConhecido, string | null>
): { itens: ItemFuncionario[]; incompletos: string[] } {
  const porCpf = new Map<string, FuncionarioParaImportacao>();
  for (const f of funcionariosDb) if (f.cpf) porCpf.set(apenasDigitos(f.cpf), f);

  const itens: ItemFuncionario[] = [];
  const incompletos: string[] = [];

  for (const linha of linhas) {
    const nome = colunas.nome ? linha[colunas.nome]?.trim() : "";
    if (!nome) continue;
    const cpfBruto = colunas.cpf ? linha[colunas.cpf]?.trim() : "";
    const cpfDigitos = cpfBruto ? apenasDigitos(cpfBruto) : "";
    const existente = cpfDigitos ? porCpf.get(cpfDigitos) : undefined;

    if (existente) {
      const camposTexto: { campo: DiffFuncionario["campo"]; coluna: string | null; atual: string | null }[] = [
        { campo: "cargo", coluna: colunas.cargo, atual: existente.cargo },
        { campo: "setor", coluna: colunas.setor, atual: existente.setor },
        { campo: "telefone", coluna: colunas.telefone, atual: existente.telefone },
        { campo: "email", coluna: colunas.email, atual: existente.email },
      ];
      for (const { campo, coluna, atual } of camposTexto) {
        if (!coluna) continue;
        const novo = linha[coluna]?.trim();
        if (!novo) continue;
        if (normalizarTexto(novo) !== normalizarTexto(atual)) {
          itens.push({ id: `funcionario-${existente.id}-${campo}`, tipo: "atualizar", funcionarioId: existente.id, funcionarioNome: existente.nome, campo, atual, novo });
        }
      }
      const camposData: { campo: "dataNascimento" | "admissao"; coluna: string | null; atual: Date | null }[] = [
        { campo: "dataNascimento", coluna: colunas.dataNascimento, atual: existente.dataNascimento },
        { campo: "admissao", coluna: colunas.admissao, atual: existente.admissao },
      ];
      for (const { campo, coluna, atual } of camposData) {
        if (!coluna) continue;
        const bruto = linha[coluna]?.trim();
        if (!bruto) continue;
        const novaData = parsarDataBr(bruto);
        if (!novaData) continue;
        const novoTexto = formatarDataParaComparar(novaData);
        if (novoTexto !== formatarDataParaComparar(atual)) {
          itens.push({ id: `funcionario-${existente.id}-${campo}`, tipo: "atualizar", funcionarioId: existente.id, funcionarioNome: existente.nome, campo, atual: formatarDataParaComparar(atual) || null, novo: novoTexto });
        }
      }
      continue;
    }

    // Sem CPF batendo com ninguém — proposta de criação. Cargo/setor/admissão
    // são obrigatórios no cadastro (ver schema — admissao não é opcional);
    // sem algum deles, pede conferência manual em vez de criar incompleto.
    const cargo = colunas.cargo ? linha[colunas.cargo]?.trim() : "";
    const setor = colunas.setor ? linha[colunas.setor]?.trim() : "";
    const admissaoBruta = colunas.admissao ? linha[colunas.admissao]?.trim() : "";
    const admissaoData = admissaoBruta ? parsarDataBr(admissaoBruta) : null;
    const faltando = [!cargo && "cargo", !setor && "setor", !admissaoData && "data de admissão"].filter(Boolean);
    if (faltando.length > 0) {
      incompletos.push(`${nome} (falta ${faltando.join(", ")} na planilha)`);
      continue;
    }
    itens.push({
      id: `novo-${normalizarTexto(nome)}-${cpfDigitos || itens.length}`,
      tipo: "criar",
      nome,
      cpf: cpfDigitos || null,
      cargo,
      setor,
      telefone: colunas.telefone ? linha[colunas.telefone]?.trim() || null : null,
      email: colunas.email ? linha[colunas.email]?.trim() || null : null,
      dataNascimento: colunas.dataNascimento ? linha[colunas.dataNascimento]?.trim() || null : null,
      admissao: admissaoBruta,
    });
  }

  return { itens, incompletos };
}
