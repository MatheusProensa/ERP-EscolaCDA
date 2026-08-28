import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  action,
}: {
  title: string;
  subtitle?: string;
  breadcrumb?: { label: string; href?: string }[];
  action?: React.ReactNode;
}) {
  return (
    // NOVO: empilha (título em cima, ação embaixo, largura livre pra quebrar linha) no celular —
    // o action com vários botões numa linha só sem quebrar empurrava a página inteira pro lado.
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <div className="mb-1.5 flex items-center gap-1.5 text-sm text-cda-text2">
            {breadcrumb.map((item, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-4 w-4 text-cda-text3" />}
                {item.href ? (
                  <Link href={item.href} className="rounded px-1 py-0.5 -mx-1 font-medium hover:text-cda-blue hover:underline">
                    {item.label}
                  </Link>
                ) : (
                  <span>{item.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
        <h1 className="text-2xl font-bold text-cda-text">{title}</h1>
        {/* Etapa 4.9 do handoff: text-base tinha o mesmo tamanho do corpo, hierarquia fraca */}
        {subtitle && <p className="mt-1 text-sm text-cda-text2">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{action}</div>}
    </div>
  );
}
