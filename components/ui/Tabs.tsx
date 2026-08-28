"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type Tab<T extends string> = { value: T; label: string; count?: number; href?: string };

/**
 * Sublinhado — o padrão que `EstoquePainel` já usava, extraído em componente
 * (handoff de design, etapa 4.7). Use quando as abas são SEÇÕES DENTRO DA
 * MESMA PÁGINA. Para rotas irmãs de um módulo, use <Segmented> (pílula).
 */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: Tab<T>[];
  value: T;
  onChange?: (value: T) => void;
  className?: string;
}) {
  const base = "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors";

  return (
    <div className={cn("flex gap-1 border-b border-border-default", className)}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        const classes = cn(
          base,
          active ? "border-action-primary text-action-primary" : "border-transparent text-text-muted hover:text-text-body"
        );
        const inner = (
          <>
            {tab.label}
            {tab.count !== undefined && <span className="text-xs text-text-muted">{tab.count}</span>}
          </>
        );

        if (tab.href) {
          return (
            <Link key={tab.value} href={tab.href} className={classes} aria-current={active ? "page" : undefined}>
              {inner}
            </Link>
          );
        }

        return (
          <button key={tab.value} type="button" onClick={() => onChange?.(tab.value)} className={classes}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}
