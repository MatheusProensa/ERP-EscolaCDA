import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type Atalho = { label: string; href: string; icon: LucideIcon };

/** NOVO: atalhos em ícone pras páginas mais usadas de cada setor — poupa ir
 * catar na sidebar toda vez. Chip neutro (handoff de design etapa 2.3) — a cor
 * decorativa por posição não descrevia nada, e coincidia com verde/vermelho de
 * estado (ok/problema) nos badges. */
export function AtalhosRapidos({ itens, children }: { itens: Atalho[]; children?: React.ReactNode }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
      {/* NOVO: slot pra atalho que precisa de estado no client (ex.: abrir um modal
          direto, em vez de só navegar) — o resto da lista continua vindo do
          server component (DashboardAdmin) como dados simples (href/label/cor). */}
      {children}
      {itens.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="flex items-center justify-center gap-2.5 rounded-xl border border-cda-border bg-white px-4 py-3 text-sm font-medium text-cda-text shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md sm:justify-start"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-icon-neutral-bg">
            <a.icon className="h-4 w-4 text-icon-neutral" strokeWidth={2.25} />
          </span>
          {a.label}
        </Link>
      ))}
    </div>
  );
}
