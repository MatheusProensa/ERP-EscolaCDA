import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

/**
 * Estado vazio padronizado — substitui as frases soltas ("Nenhum X encontrado")
 * hoje reimplementadas em cada tela/tabela.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  subtitle,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 px-5 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cda-bg">
        <Icon className="h-5 w-5 text-cda-text3" />
      </div>
      <p className="text-sm font-medium text-cda-text2">{title}</p>
      {subtitle && <p className="max-w-xs text-xs text-cda-text3">{subtitle}</p>}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}
