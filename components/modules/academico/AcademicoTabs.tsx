import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Abas "Turmas" / "Alunos" no topo de app/(erp)/academico/turmas/page.tsx e
 * app/(erp)/alunos/page.tsx — dá a sensação de uma seção única (Acadêmico),
 * mas cada aba continua sendo sua própria rota/Server Component, preservando
 * o fetch de dados e as regras de permissão (`lib/permissoes.ts`) que já
 * existem para /academico/turmas e /alunos.
 */
export function AcademicoTabs({
  active,
  totalTurmas,
  totalAlunos,
}: {
  active: "turmas" | "alunos";
  totalTurmas?: number;
  totalAlunos?: number;
}) {
  const tabs = [
    { key: "turmas" as const, label: "Turmas", href: "/academico", count: totalTurmas },
    { key: "alunos" as const, label: "Alunos", href: "/alunos", count: totalAlunos },
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
