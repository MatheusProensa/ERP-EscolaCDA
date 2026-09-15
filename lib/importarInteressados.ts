import { validarPlanilhaDataUri, parsarPlanilha as parsarPlanilhaGenerico, detectarColunasGenerico, normalizarTexto } from "./planilha";

export { validarPlanilhaDataUri, normalizarTexto };

/** Importação de planilha de Interessados — mesmo padrão de Alunos/
 * Funcionários (lib/importarAlunos.ts, lib/importarFuncionarios.ts),
 * out/2026, pedido do dono. Diferente dos outros 2: aqui não faz sentido
 * "atualizar" (é gente nova entrando na lista, não um cadastro existente
 * sendo sincronizado) — toda linha reconhecível vira proposta de CRIAÇÃO;
 * quem já parece estar na lista (mesma criança + mesmo responsável) entra
 * como possível duplicata, sinalizada mas ainda selecionável (a decisão de
 * criar mesmo assim é de quem está importando, não do sistema). Nada é
 * gravado sem confirmação — ver app/api/interessados/importar/route.ts
 * (pré-visualização) e .../confirmar/route.ts (aplica só o marcado). */

export const CAMPOS_CONHECIDOS = {
  nomeCrianca: ["crianca", "criança", "nome da crianca", "nome crianca", "aluno", "nome"],
  nomeResponsavel: ["responsavel", "nome do responsavel", "nome responsavel", "mae", "mãe", "pai"],
  telefoneResponsavel: ["telefone", "celular", "contato", "whatsapp"],
  emailResponsavel: ["email", "e mail"],
  turmaDesejada: ["turma", "turma desejada", "turma de interesse"],
  dataNascimento: ["nascimento", "data de nascimento", "data nascimento"],
  interesseTexto: ["interesse", "ano de interesse", "periodo de interesse"],
  oQueBusca: ["o que busca", "busca", "prioridade", "o que procura"],
  observacoes: ["observacoes", "observações", "obs"],
} as const;

export type CampoConhecido = keyof typeof CAMPOS_CONHECIDOS;

const ALIASES_TODOS = Object.values(CAMPOS_CONHECIDOS).flat() as string[];

export async function parsarPlanilha(buffer: Buffer): Promise<{ headers: string[]; linhas: Record<string, string>[] }> {
  return parsarPlanilhaGenerico(buffer, ALIASES_TODOS);
}

export function detectarColunas(headers: string[]): Record<CampoConhecido, string | null> {
  return detectarColunasGenerico(headers, CAMPOS_CONHECIDOS);
}

/** "dd/mm/aaaa" → Date em meia-noite UTC, mesma convenção de data pura do
 * resto do sistema. null se não bater com o formato. */
export function parsarDataBr(texto: string): Date | null {
  const m = texto.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, dia, mes, ano] = m;
  const data = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
  return isNaN(data.getTime()) ? null : data;
}

export type NovoInteressado = {
  id: string;
  nomeCrianca: string;
  nomeResponsavel: string;
  telefoneResponsavel: string;
  emailResponsavel: string | null;
  turmaDesejadaId: string | null;
  turmaDesejadaTexto: string | null;
  interesseTexto: string | null;
  dataNascimento: string | null;
  oQueBusca: string | null;
  observacoes: string | null;
  /** Já existe alguém na lista com o mesmo nome de criança+responsável —
   * não bloqueia a criação, só avisa (nomes iguais podem ser 2 famílias
   * diferentes, ou 2 filhos da mesma família com nomes parecidos). */
  possivelDuplicata: boolean;
};

type InteressadoExistente = { nomeCrianca: string; nomeResponsavel: string };
type TurmaParaMatch = { id: string; nome: string };

/** Telefone é o único campo realmente obrigatório no schema (nome da
 * criança e do responsável também) — linha sem algum dos 3 é pulada (não
 * incompleta pra conferência manual, como em Funcionários: aqui geralmente
 * é só uma linha vazia da planilha, não dado real faltando). */
export function construirNovos(
  interessadosDb: InteressadoExistente[],
  turmas: TurmaParaMatch[],
  linhas: Record<string, string>[],
  colunas: Record<CampoConhecido, string | null>
): { novos: NovoInteressado[]; ignorados: number } {
  const existentes = new Set(interessadosDb.map((i) => `${normalizarTexto(i.nomeCrianca)}|${normalizarTexto(i.nomeResponsavel)}`));
  const novos: NovoInteressado[] = [];
  let ignorados = 0;

  linhas.forEach((linha, idx) => {
    const nomeCrianca = colunas.nomeCrianca ? linha[colunas.nomeCrianca]?.trim() : "";
    const nomeResponsavel = colunas.nomeResponsavel ? linha[colunas.nomeResponsavel]?.trim() : "";
    const telefone = colunas.telefoneResponsavel ? linha[colunas.telefoneResponsavel]?.trim() : "";
    if (!nomeCrianca || !nomeResponsavel || !telefone) {
      ignorados++;
      return;
    }

    const turmaTexto = colunas.turmaDesejada ? linha[colunas.turmaDesejada]?.trim() : "";
    const turmaBatida = turmaTexto ? turmas.find((t) => normalizarTexto(t.nome) === normalizarTexto(turmaTexto)) : undefined;

    novos.push({
      id: `interessado-${idx}-${normalizarTexto(nomeCrianca)}`,
      nomeCrianca,
      nomeResponsavel,
      telefoneResponsavel: telefone,
      emailResponsavel: colunas.emailResponsavel ? linha[colunas.emailResponsavel]?.trim() || null : null,
      turmaDesejadaId: turmaBatida?.id ?? null,
      // Guarda o texto original quando não achou Turma cadastrada com esse
      // nome — não perde a informação, só não vincula (mesmo espírito do
      // campo ListaEspera.interesseTexto pra quando não bate com nenhuma Turma).
      turmaDesejadaTexto: turmaTexto && !turmaBatida ? turmaTexto : null,
      interesseTexto: colunas.interesseTexto ? linha[colunas.interesseTexto]?.trim() || null : null,
      dataNascimento: colunas.dataNascimento ? linha[colunas.dataNascimento]?.trim() || null : null,
      oQueBusca: colunas.oQueBusca ? linha[colunas.oQueBusca]?.trim() || null : null,
      observacoes: colunas.observacoes ? linha[colunas.observacoes]?.trim() || null : null,
      possivelDuplicata: existentes.has(`${normalizarTexto(nomeCrianca)}|${normalizarTexto(nomeResponsavel)}`),
    });
  });

  return { novos, ignorados };
}
