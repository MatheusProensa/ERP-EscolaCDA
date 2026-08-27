import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type Atalho = { label: string; href: string; icon: LucideIcon; color: string };

/** NOVO: atalhos em ícone pras páginas mais usadas de cada setor — poupa ir
 * catar na sidebar toda vez. Mesma cor/estilo de chip circular do MetricCard,
 * pra manter a linguagem visual do dashboard. */
export function AtalhosRapidos({ itens }: { itens: Atalho[] }) {
  return (
    <div className="mb-5 flex flex-wrap gap-3">
      {itens.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="flex items-center gap-2.5 rounded-xl border border-cda-border bg-white px-4 py-3 text-sm font-medium text-cda-text shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: `color-mix(in oklch, ${a.color} 14%, white)` }}
          >
            <a.icon className="h-4 w-4" style={{ color: a.color }} strokeWidth={2.25} />
          </span>
          {a.label}
        </Link>
      ))}
    </div>
  );
}
