import { cn } from "@/lib/utils";
import { Loader2, type LucideIcon } from "lucide-react";
import Link from "next/link";

/**
 * Botão só de ícone (handoff de design, etapa 4.1). Substitui a reimplementação
 * à mão em 14 lugares do sistema, que existiam em quatro tamanhos diferentes
 * (16, 24, 32 e 36px) — sendo os de 16px, nas tabelas, o menor alvo de clique
 * de toda a interface.
 *
 * `label` é obrigatório de propósito: metade das versões antigas só tinha
 * `title`, que não funciona em toque e não é lido por leitor de tela.
 */
export function IconButton({
  icon: Icon,
  label,
  variant = "neutral",
  size = "md",
  bordered = false,
  loading,
  disabled,
  href,
  onClick,
  className,
}: {
  icon: LucideIcon;
  label: string;
  variant?: "neutral" | "danger";
  /** md = 36px (padrão) · sm = 32px (dentro de card ou tabela densa) */
  size?: "sm" | "md";
  /** Borda + fundo branco. Para setas de navegação, que precisam de presença própria. */
  bordered?: boolean;
  loading?: boolean;
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const classes = cn(
    "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-control)] text-text-body transition-colors",
    size === "sm" ? "h-8 w-8" : "h-9 w-9",
    bordered && "border border-border-default bg-white",
    "hover:bg-surface-app",
    variant === "danger" && "hover:text-status-danger",
    (disabled || loading) && "opacity-50 pointer-events-none",
    className
  );

  const glyph = loading ? (
    <Loader2 className={size === "sm" ? "h-[15px] w-[15px] animate-spin" : "h-[18px] w-[18px] animate-spin"} />
  ) : (
    <Icon className={size === "sm" ? "h-[15px] w-[15px]" : "h-[18px] w-[18px]"} />
  );

  if (href) {
    return (
      <Link href={href} className={classes} title={label} aria-label={label}>
        {glyph}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled || loading} className={classes} title={label} aria-label={label}>
      {glyph}
    </button>
  );
}
