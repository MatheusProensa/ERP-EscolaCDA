import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Tone = "critical" | "danger" | "warning" | "brand" | "info";

const TONE_VAR: Record<Tone, string> = {
  critical: "var(--status-critical)",
  danger: "var(--status-danger)",
  warning: "var(--status-warning)",
  brand: "var(--accent-brand)",
  info: "var(--status-info)",
};

/**
 * Banner de alerta — UM formato, cinco tons (handoff de design, etapa 4.3).
 *
 * Substitui as cinco implementações diferentes que existiam:
 *   CensoAlerta · aniversariantes/page · documentos/page · usuarios/page
 *   (que usava o emoji 🔑 como ícone) · boletos/page + notas-fiscais/page
 *   (idênticos entre si).
 *
 * Sempre que possível passe uma `action`: um banner que informa sem oferecer o
 * que fazer obriga o usuário a descobrir o caminho sozinho.
 */
export function Alert({
  tone,
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  tone: Tone;
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const cor = TONE_VAR[tone];
  // O amarelo não tem contraste para ícone branco — no tom "brand" o ícone é navy.
  const corIcone = tone === "brand" ? "var(--cda-navy)" : cor;

  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3.5 rounded-[var(--radius-card)] border p-4 sm:flex-row sm:items-center",
        className
      )}
      style={{
        borderColor: `color-mix(in srgb, ${cor} ${tone === "brand" ? "55%" : "30%"}, transparent)`,
        backgroundColor: `color-mix(in srgb, ${cor} ${tone === "brand" ? "10%" : "6%"}, #fff)`,
      }}
    >
      <div className="flex items-start gap-3.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor: `color-mix(in srgb, ${cor} ${tone === "brand" ? "30%" : "15%"}, transparent)`,
            color: corIcone,
          }}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-heading">{title}</p>
          {children && <p className="mt-0.5 text-[13px] leading-relaxed text-text-body">{children}</p>}
        </div>
      </div>
      {action && <div className="w-full shrink-0 sm:ml-auto sm:w-auto">{action}</div>}
    </div>
  );
}
