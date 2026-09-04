import type { BadgeVariant } from "@/components/ui/Badge";

/**
 * Mapeamento central situação → variante de Badge, para os enums de status do ERP.
 * Substitui os `Record<Situacao, BadgeVariant>` hoje duplicados em cada tabela
 * (AlunoTable, EstoquePainel, DocumentosLista...) — ver
 * diagnóstico de UX, seção "Componentes reutilizáveis: oportunidades de padronizar".
 */

export const STATUS_ESTOQUE_BADGE: Record<string, { variant: BadgeVariant; label: string }> = {
  ok: { variant: "green", label: "Normal" },
  baixa: { variant: "amber", label: "Atenção" },
  crit: { variant: "red", label: "Crítico" },
  zero: { variant: "red", label: "Zerado" },
};

// Ordem pensada pro fluxo real de ligação da secretaria (Interessados), não a
// ordem do enum no banco: começa em quem ainda precisa de ação, termina no
// desfecho (matriculou ou não avançou).
export const STATUS_INTERESSADO_BADGE: Record<string, { variant: BadgeVariant; label: string }> = {
  AGUARDANDO: { variant: "cat1", label: "Aguardando" },
  CONTATADO: { variant: "info", label: "Contatado" },
  CHAMAR_NOVAMENTE: { variant: "warning", label: "Chamar novamente" },
  NAO_RESPONDEU: { variant: "warning", label: "Chamado s/ retorno" },
  PORTAS_ABERTAS: { variant: "cat5", label: "Chamar p/ Portas Abertas" },
  SEM_RETORNO_APOS_VISITA: { variant: "warning", label: "Visitou, sem retorno" },
  NAO_TEM_INTERESSE: { variant: "neutral", label: "Não tem interesse" },
  VALOR_ULTRAPASSA: { variant: "neutral", label: "Valor ultrapassa" },
  SEM_VAGA: { variant: "warning", label: "Sem vaga na escola" },
  MATRICULADO: { variant: "success", label: "Matriculado" },
  DESISTIU: { variant: "danger", label: "Desistiu" },
};

export function situacaoVisual<T extends { variant: BadgeVariant; label: string }>(
  dicionario: Record<string, T>,
  chave: string
): T | { variant: "gray"; label: string } {
  return dicionario[chave] ?? { variant: "gray", label: chave };
}
