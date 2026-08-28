import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type CatTone = "cat1" | "cat2" | "cat3" | "cat4" | "cat5" | "cat6";

const TONE_STYLE: Record<CatTone, { bg: string; icon: string }> = {
  cat1: { bg: "var(--cat-1-bg)", icon: "var(--cat-1-text)" },
  cat2: { bg: "var(--cat-2-bg)", icon: "var(--cat-2-text)" },
  cat3: { bg: "var(--cat-3-bg)", icon: "var(--cat-3-text)" },
  cat4: { bg: "var(--cat-4-bg)", icon: "var(--cat-4-text)" },
  cat5: { bg: "var(--cat-5-bg)", icon: "var(--cat-5-text)" },
  cat6: { bg: "var(--cat-6-bg)", icon: "var(--cat-6-text)" },
};

export type Atalho = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Cor categórica do chip — não é estado, só identidade visual por destino
   * (mesma paleta do Badge/avatares). Sem tone, cai no neutro. */
  tone?: CatTone;
};

/** NOVO: atalhos em ícone pras páginas mais usadas de cada setor — poupa ir
 * catar na sidebar toda vez. Cor categórica por destino (não decorativa por
 * posição, e nunca a mesma paleta de verde/vermelho de estado dos badges) —
 * ajuda a diferenciar os chips num relance sem precisar ler o texto. */
export function AtalhosRapidos({ itens, children }: { itens: Atalho[]; children?: React.ReactNode }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
      {/* NOVO: slot pra atalho que precisa de estado no client (ex.: abrir um modal
          direto, em vez de só navegar) — o resto da lista continua vindo do
          server component (DashboardAdmin) como dados simples (href/label/tone). */}
      {children}
      {itens.map((a) => {
        const estilo = a.tone ? TONE_STYLE[a.tone] : null;
        return (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center justify-center gap-2.5 rounded-xl border border-cda-border bg-white px-4 py-3 text-sm font-medium text-cda-text shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md sm:justify-start"
          >
            <span
              className={estilo ? "flex h-8 w-8 items-center justify-center rounded-full" : "flex h-8 w-8 items-center justify-center rounded-full bg-icon-neutral-bg"}
              style={estilo ? { backgroundColor: estilo.bg } : undefined}
            >
              <a.icon className={estilo ? "h-4 w-4" : "h-4 w-4 text-icon-neutral"} style={estilo ? { color: estilo.icon } : undefined} strokeWidth={2.25} />
            </span>
            {a.label}
          </Link>
        );
      })}
    </div>
  );
}
