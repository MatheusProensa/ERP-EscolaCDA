import { cn } from "@/lib/utils";

/**
 * Variantes por PAPEL, não por tom (handoff de design, etapa 3.1).
 *
 * - Semânticos (success/warning/critical/danger/info/neutral): reservados a ESTADO.
 * - Categóricos (cat1…cat6): tipo, categoria, papel de acesso. Sem verde e sem
 *   vermelho, para que nenhuma categoria seja lida como estado.
 * - count: contagem numérica (ex.: quantos funcionários num setor).
 *
 * As variantes antigas (green/red/amber/blue/purple/teal/pink/gray) continuam
 * funcionando como ALIAS DEPRECIADO, para não quebrar as ~15 chamadas existentes
 * de uma vez. Migrar aos poucos e remover depois.
 */
export type BadgeVariant =
  | "success"
  | "warning"
  | "critical"
  | "danger"
  | "info"
  | "neutral"
  | "cat1"
  | "cat2"
  | "cat3"
  | "cat4"
  | "cat5"
  | "cat6"
  | "count"
  // depreciados
  | "green"
  | "red"
  | "amber"
  | "blue"
  | "purple"
  | "teal"
  | "pink"
  | "gray";

/** Exportado pra quem precisa aplicar a mesma cor de variante fora de um
 * <Badge> — ex.: o fundo do <select> de status em InteressadosTable, que
 * precisa mudar de cor junto com o valor escolhido. */
export const BADGE_VARIANT_STYLE: Record<BadgeVariant, React.CSSProperties> = {
  success: { backgroundColor: "color-mix(in srgb, var(--status-success) 10%, transparent)", color: "var(--status-success)" },
  warning: { backgroundColor: "color-mix(in srgb, var(--status-warning) 10%, transparent)", color: "var(--status-warning)" },
  critical: { backgroundColor: "color-mix(in srgb, var(--status-critical) 10%, transparent)", color: "var(--status-critical)" },
  danger: { backgroundColor: "color-mix(in srgb, var(--status-danger) 10%, transparent)", color: "var(--status-danger)" },
  info: { backgroundColor: "color-mix(in srgb, var(--status-info) 10%, transparent)", color: "var(--status-info)" },
  neutral: { backgroundColor: "color-mix(in srgb, var(--text-muted) 15%, transparent)", color: "var(--text-body)" },

  cat1: { backgroundColor: "var(--cat-1-bg)", color: "var(--cat-1-text)" },
  cat2: { backgroundColor: "var(--cat-2-bg)", color: "var(--cat-2-text)" },
  cat3: { backgroundColor: "var(--cat-3-bg)", color: "var(--cat-3-text)" },
  cat4: { backgroundColor: "var(--cat-4-bg)", color: "var(--cat-4-text)" },
  cat5: { backgroundColor: "var(--cat-5-bg)", color: "var(--cat-5-text)" },
  cat6: { backgroundColor: "var(--cat-6-bg)", color: "var(--cat-6-text)" },

  count: { backgroundColor: "var(--surface-app)", color: "var(--text-body)", fontWeight: 600, fontVariantNumeric: "tabular-nums" },

  // ---- alias depreciado ----
  green: { backgroundColor: "color-mix(in srgb, var(--status-success) 10%, transparent)", color: "var(--status-success)" },
  red: { backgroundColor: "color-mix(in srgb, var(--status-danger) 10%, transparent)", color: "var(--status-danger)" },
  amber: { backgroundColor: "color-mix(in srgb, var(--status-warning) 10%, transparent)", color: "var(--status-warning)" },
  blue: { backgroundColor: "var(--cat-1-bg)", color: "var(--cat-1-text)" },
  purple: { backgroundColor: "var(--cat-3-bg)", color: "var(--cat-3-text)" },
  teal: { backgroundColor: "var(--cat-2-bg)", color: "var(--cat-2-text)" },
  pink: { backgroundColor: "var(--cat-4-bg)", color: "var(--cat-4-text)" },
  gray: { backgroundColor: "color-mix(in srgb, var(--text-muted) 15%, transparent)", color: "var(--text-body)" },
};

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      style={BADGE_VARIANT_STYLE[variant]}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        className
      )}
    >
      {children}
    </span>
  );
}
