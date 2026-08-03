import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Abas "Turmas" / "Alunos" / "Lista de espera" / "Virada de ano" no topo das
 * páginas do módulo Acadêmico — dá a sensação de uma seção única, mas cada
 * aba continua sendo sua própria rota/Server Component, preservando o fetch
 * de dados e as regras de permissão (`lib/permissoes.ts`) que já existem
 * pra cada rota. Ficam de fora da Sidebar (que só lista "Acadêmico") pra não
 * duplicar duas entradas ativas ao mesmo tempo quando se está numa sub-rota.
 */
export function AcademicoTabs({
  active,
  totalTurmas,
  totalAlunos,
  totalListaEspera,
  souGestao,
}: {
  active: "turmas" | "alunos" | "lista-espera" | "virada-de-ano";
  totalTurmas?: number;
  totalAlunos?: number;
  totalListaEspera?: number;
  /** Aba "Virada de ano" só aparece pra quem tem acesso de gestão. */
  souGestao?: boolean;
}) {
  const tabs = [
    { key: "turmas" as const, label: "Turmas", href: "/academico", count: totalTurmas },
    { key: "alunos" as const, label: "Alunos", href: "/alunos", count: totalAlunos },
    { key: "lista-espera" as const, label: "Lista de espera", href: "/academico/lista-espera", count: totalListaEspera },
    ...(souGestao
      ? [{ key: "virada-de-ano" as const, label: "Virada de ano", href: "/academico/virada-de-ano", count: undefined }]
      : []),
  ];

  return (
    <div className="mb-5 inline-flex items-center gap-0.5 rounded-lg border border-cda-border bg-cda-bg p-0.5">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors",
            active === tab.key
              ? "bg-white text-cda-text shadow-sm"
              : "text-cda-text3 hover:text-cda-text2"
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn("text-xs", active === tab.key ? "text-cda-text2" : "text-cda-text3")}>
              {tab.count}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
