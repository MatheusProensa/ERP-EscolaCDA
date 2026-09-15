import { cn } from "@/lib/utils";
import { Loader2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-cda-blue text-white hover:bg-cda-blue/90",
  // NOVO: variante navy — antes cada tela que precisava disso forçava
  // className="bg-cda-navy hover:bg-cda-navy/90" no Button (handoff 2.5).
  secondary: "bg-surface-nav text-white hover:bg-surface-nav/90",
  // Achado da auditoria: ghost e outline usavam o mesmo hover:bg-cda-bg —
  // dentro de um card cinza (que já tem essa cor de fundo) ficavam
  // indistinguíveis no hover. Ghost usa uma sobreposição neutra própria.
  ghost: "bg-transparent text-cda-text2 hover:bg-cda-text/[0.06]",
  danger: "bg-cda-red text-white hover:bg-cda-red/90",
  outline: "bg-white text-cda-text border border-cda-border hover:bg-cda-bg",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

type BaseProps = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  /** Ícone à esquerda do rótulo. Passar o ícone em children também continua funcionando. */
  icon?: LucideIcon;
  className?: string;
  children: React.ReactNode;
};

type ButtonProps = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type LinkButtonProps = BaseProps & {
  href: string;
  /** Força download em vez de navegar — mesmo comportamento do atributo
   * nativo `download` do `<a>`. Achado da auditoria: telas com link de
   * download reimplementavam o botão à mão em vez de usar esse componente
   * (ex.: PDF assinado em AssinarContratoForm) por falta dessa prop aqui. */
  download?: string | boolean;
};

function baseClasses(variant: Variant, size: Size, className?: string) {
  // Etapa 4.9 do handoff: o :focus-visible global (globals.css) já cobre o anel
  // de foco de teclado — a redeclaração local aqui era redundante.
  return cn(
    "inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  icon: Icon,
  className,
  children,
  disabled,
  href,
  ...props
}: ButtonProps | LinkButtonProps) {
  // download só existe em LinkButtonProps — tirado à parte porque o tipo
  // união (Button também serve pra <button> nativo) não deixa desestruturar
  // direto sem TS reclamar que a outra metade da união não tem essa prop.
  const download = href ? (props as { download?: string | boolean }).download : undefined;
  const inner = (
    <>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {!loading && Icon && <Icon className="h-4 w-4" />}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} download={download} className={baseClasses(variant, size, className)}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      className={baseClasses(variant, size, className)}
      disabled={disabled || loading}
      {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {inner}
    </button>
  );
}
