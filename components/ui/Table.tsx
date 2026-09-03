import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "./EmptyState";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)}>{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-cda-border text-left text-xs font-medium uppercase tracking-wide text-cda-text3">
        {children}
      </tr>
    </thead>
  );
}

export function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-4 py-3 font-medium", className)}>{children}</th>;
}

/** Cabeçalho da coluna de ações: largura mínima, sem rótulo (handoff etapa 4.9). */
export function ThActions() {
  return <th className="w-px px-4 py-3" />;
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-cda-border">{children}</tbody>;
}

export function Tr({
  children,
  className,
  style,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  /** Ex.: borderLeft colorido por categoria/estado da linha (InteressadosTable). */
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  // NOVO: linhas clicáveis agora são focáveis e ativáveis via teclado (Enter/Espaço),
  // com anel de foco visível — antes só funcionavam com o mouse.
  return (
    <tr
      onClick={onClick}
      style={style}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "transition-colors",
        onClick && "cursor-pointer hover:bg-cda-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cda-blue/40",
        className
      )}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 text-cda-text", className)}>{children}</td>;
}

/** Célula de ações: um único espaçamento para todas as tabelas do sistema
 * (handoff etapa 4.9) — antes cada tabela usava um gap diferente. */
export function TdActions({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-3">
      <div className="flex items-center justify-end gap-0.5">{children}</div>
    </td>
  );
}

export function TableEmpty({
  colSpan,
  children,
  icon,
  subtitle,
  action,
}: {
  colSpan: number;
  children: React.ReactNode;
  icon?: LucideIcon;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <EmptyState icon={icon} title={String(children)} subtitle={subtitle} action={action} />
      </td>
    </tr>
  );
}
