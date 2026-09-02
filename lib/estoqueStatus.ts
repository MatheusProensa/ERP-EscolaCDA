import type { BadgeVariant } from "@/components/ui/Badge";

export type StatusEstoque = "ok" | "baixa" | "crit" | "zero";

// "Crítico" é metade do mínimo configurado pro item — nomeado pra não ficar
// um "0.5" solto decidindo a regra.
const FRACAO_CRITICO = 0.5;

export function statusEstoque(quantidade: number, minimo: number): StatusEstoque {
  if (quantidade <= 0) return "zero";
  if (quantidade <= minimo * FRACAO_CRITICO) return "crit";
  if (quantidade <= minimo) return "baixa";
  return "ok";
}

export const STATUS_ESTOQUE_INFO: Record<StatusEstoque, { label: string; variant: BadgeVariant; cor: string }> = {
  ok: { label: "Normal", variant: "success", cor: "var(--status-success)" },
  baixa: { label: "Atenção", variant: "warning", cor: "var(--status-warning)" },
  crit: { label: "Crítico", variant: "critical", cor: "var(--status-critical)" },
  zero: { label: "Zerado", variant: "danger", cor: "var(--status-danger)" },
};

/**
 * Tipo de movimentação de estoque. Estava DUPLICADO em MovimentacoesTab.tsx e
 * VisaoGeralTab.tsx, cada um com hex próprio e tint por concatenação de "1A"
 * (handoff de design, etapa 3.6). Entrada e saída são direção do movimento —
 * cor semântica legítima, não decorativa.
 */
export const MOV_INFO: Record<string, { label: string; variant: BadgeVariant; sinal: string }> = {
  ENTRADA: { label: "Entrada", variant: "success", sinal: "+" },
  SAIDA: { label: "Saída", variant: "warning", sinal: "-" },
  AJUSTE: { label: "Ajuste", variant: "info", sinal: "" },
  ESTORNO: { label: "Estorno", variant: "neutral", sinal: "" },
};

/**
 * Categoria de material — paleta CATEGÓRICA (handoff etapa 3.5). Antes eram
 * sete hex soltos, quatro deles (#B5701A, #5C6F8A, #A8506B, #5A6A85) sem
 * existir em nenhum outro lugar do sistema.
 */
const CATEGORIA_ICONES: { termos: string[]; icone: string; cat: number }[] = [
  { termos: ["material escolar", "escolar", "expediente", "papelaria"], icone: "PenLine", cat: 1 },
  { termos: ["limpeza"], icone: "SprayCan", cat: 2 },
  { termos: ["higiene"], icone: "Droplets", cat: 2 },
  { termos: ["cozinha", "copa", "alimenta"], icone: "Coffee", cat: 5 },
  { termos: ["informática", "informatica", "tecnologia"], icone: "Printer", cat: 3 },
  { termos: ["manutenção", "manutencao", "ferramenta"], icone: "Wrench", cat: 6 },
  { termos: ["saúde", "saude", "epi", "segurança", "seguranca"], icone: "HardHat", cat: 4 },
];

export function categoriaVisual(categoria: string): { icone: string; bg: string; cor: string } {
  const alvo = categoria.toLowerCase();
  const encontrado = CATEGORIA_ICONES.find((c) => c.termos.some((t) => alvo.includes(t)));
  const n = encontrado?.cat ?? 6;
  return {
    icone: encontrado?.icone ?? "Package",
    bg: `var(--cat-${n}-bg)`,
    cor: `var(--cat-${n}-text)`,
  };
}
