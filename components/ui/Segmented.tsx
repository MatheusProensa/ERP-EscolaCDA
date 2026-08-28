"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type Opt<T extends string> = { value: T; label: string; count?: number; href?: string };

/** Pílula sobre fundo cinza. Use quando as abas são ROTAS IRMÃS do mesmo
 * módulo (handoff de design, etapa 4.7 — ganhou suporte a `href` pra
 * AcademicoTabs usar este componente em vez de reimplementar o mesmo visual). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Opt<T>[];
  value: T;
  onChange?: (value: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-cda-border bg-cda-bg p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        const classes = cn(
          "flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors",
          active ? "bg-white text-cda-text shadow-sm" : "text-cda-text3 hover:text-cda-text2"
        );
        const inner = (
          <>
            {opt.label}
            {opt.count !== undefined && (
              <span className={cn("text-[11px]", active ? "text-cda-text2" : "text-cda-text3")}>{opt.count}</span>
            )}
          </>
        );

        if (opt.href) {
          return (
            <Link key={opt.value} href={opt.href} className={classes} aria-current={active ? "page" : undefined}>
              {inner}
            </Link>
          );
        }

        return (
          <button key={opt.value} type="button" onClick={() => onChange?.(opt.value)} className={classes}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}
