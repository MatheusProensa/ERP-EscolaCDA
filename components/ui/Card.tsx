import { cn } from "@/lib/utils";

/** Borda esquerda de 4px como ÚNICO vocabulário de ênfase de card (handoff de
 * design, etapa 4.6) — o padrão que MuralWidget já usava. */
const EMPHASIS: Record<string, string> = {
  brand: "border-l-4 border-l-accent-brand",
  warning: "border-l-4 border-l-status-warning",
  danger: "border-l-4 border-l-status-danger",
};

export function Card({
  children,
  className,
  title,
  action,
  emphasis,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  action?: React.ReactNode;
  /** Ênfase visual. Substitui os border-l-4 e bordas coloridas soltas. */
  emphasis?: "brand" | "warning" | "danger";
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        "rounded-[10px] border border-cda-border bg-cda-surface",
        emphasis && EMPHASIS[emphasis],
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-cda-border px-5 py-4">
          {title && <h3 className="text-sm font-semibold text-cda-text">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
