import type { BadgeVariant } from "@/components/ui/Badge";

/**
 * Mapeamento central situação → variante de Badge, para os enums de status do ERP.
 * Substitui os `Record<Situacao, BadgeVariant>` hoje duplicados em cada tabela
 * (AlunoTable, EstoquePainel, DocumentosLista...) — ver
 * diagnóstico de UX, seção "Componentes reutilizáveis: oportunidades de padronizar".
 */

export const STATUS_ESTOQUE_BADGE: Record<string, { variant: BadgeVariant; label: string }> = {
  ok: { variant: "success", label: "Normal" },
  baixa: { variant: "warning", label: "Atenção" },
  crit: { variant: "critical", label: "Crítico" },
  zero: { variant: "critical", label: "Zerado" },
};

// Ordem pensada pro fluxo real de ligação da secretaria (Interessados), não a
// ordem do enum no banco: começa em quem ainda precisa de ação, termina no
// desfecho (matriculou ou não avançou).
// Cor por status revista pra dar pra diferenciar num relance (set/2026): antes
// "Chamar novamente", "Chamado s/ retorno", "Visitou sem retorno" e "Sem vaga"
// eram TODOS a mesma cor "warning" (idêntica), e "Não tem interesse"/"Valor
// ultrapassa" também dividiam a mesma cor — 6 dos 11 status ficavam
// indistinguíveis pela cor. A paleta do sistema só tem ~9 tons realmente
// diferentes entre si (cat1 é idêntico a "info", e "neutral" é quase idêntico
// a cat6), então com 11 status não dá pra ter 11 cores 100% únicas — por isso
// "warning"/"critical"/cat5 (3 tons de laranja/dourado, mas cada um diferente
// do outro) foram usados nos 3 status de "ainda precisa de ação", e
// "neutral"/cat6 (cinzas bem parecidos) nos 2 status de "encerrado, sem
// culpa de ninguém" — de propósito, já que esses pares são parecidos em
// significado também.
export const STATUS_INTERESSADO_BADGE: Record<string, { variant: BadgeVariant; label: string }> = {
  AGUARDANDO: { variant: "info", label: "Aguardando" },
  CONTATADO: { variant: "cat2", label: "Contatado" },
  CHAMAR_NOVAMENTE: { variant: "warning", label: "Chamar novamente" },
  NAO_RESPONDEU: { variant: "critical", label: "Chamado s/ retorno" },
  PORTAS_ABERTAS: { variant: "cat4", label: "Chamar p/ Portas Abertas" },
  SEM_RETORNO_APOS_VISITA: { variant: "cat3", label: "Visitou, sem retorno" },
  SEM_VAGA: { variant: "cat5", label: "Sem vaga na escola" },
  NAO_TEM_INTERESSE: { variant: "neutral", label: "Não tem interesse" },
  VALOR_ULTRAPASSA: { variant: "cat6", label: "Valor ultrapassa" },
  MATRICULADO: { variant: "success", label: "Matriculado" },
  DESISTIU: { variant: "danger", label: "Desistiu" },
};

// Ordem pensada pro fluxo real de confirmação (Festa da Família): começa em
// quem ainda não respondeu, passa pelos dois jeitos de confirmar (agenda
// impressa vs. formulário online — mesmo peso, "success" pros dois, só o
// rótulo muda pra secretaria saber por onde a família respondeu), termina
// nos desfechos negativos/definitivos.
export const STATUS_FESTA_FAMILIA_BADGE: Record<string, { variant: BadgeVariant; label: string }> = {
  SEM_RESPOSTA: { variant: "neutral", label: "Sem resposta" },
  NAO_DEU_RETORNO: { variant: "warning", label: "Não deu retorno" },
  CONFIRMADO_AGENDA: { variant: "success", label: "Confirmado (agenda)" },
  CONFIRMADO_FORMS: { variant: "success", label: "Confirmado (forms)" },
  NAO_IRAO: { variant: "danger", label: "Não irão" },
  VAO_SE_MUDAR: { variant: "cat6", label: "Vão se mudar" },
};

export function situacaoVisual<T extends { variant: BadgeVariant; label: string }>(
  dicionario: Record<string, T>,
  chave: string
): T | { variant: "gray"; label: string } {
  return dicionario[chave] ?? { variant: "gray", label: chave };
}
