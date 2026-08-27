import type { BadgeVariant } from "@/components/ui/Badge";

/**
 * Mapeamento central situação → variante de Badge, para os enums de status do ERP.
 * Substitui os `Record<Situacao, BadgeVariant>` hoje duplicados em cada tabela
 * (AlunoTable, EstoquePainel, DocumentosLista...) — ver
 * diagnóstico de UX, seção "Componentes reutilizáveis: oportunidades de padronizar".
 */

export const SITUACAO_MATRICULA: Record<string, { variant: BadgeVariant; label: string }> = {
  ATIVA: { variant: "green", label: "Ativa" },
  TRANCADA: { variant: "amber", label: "Trancada" },
  CANCELADA: { variant: "red", label: "Cancelada" },
  TRANSFERIDA: { variant: "gray", label: "Transferida" },
  CONCLUIDA: { variant: "blue", label: "Concluída" },
};

export const STATUS_ESTOQUE_BADGE: Record<string, { variant: BadgeVariant; label: string }> = {
  ok: { variant: "green", label: "Normal" },
  baixa: { variant: "amber", label: "Atenção" },
  crit: { variant: "red", label: "Crítico" },
  zero: { variant: "red", label: "Zerado" },
};

export function situacaoVisual<T extends { variant: BadgeVariant; label: string }>(
  dicionario: Record<string, T>,
  chave: string
): T | { variant: "gray"; label: string } {
  return dicionario[chave] ?? { variant: "gray", label: chave };
}
