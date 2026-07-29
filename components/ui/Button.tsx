import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-cda-blue text-white hover:bg-cda-blue/90",
  ghost: "bg-transparent text-cda-text2 hover:bg-cda-bg",
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
  className?: string;
  children: React.ReactNode;
};

type ButtonProps = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type LinkButtonProps = BaseProps & {
  href: string;
};

function baseClasses(variant: Variant, size: Size, className?: string) {
  return cn(
    // NOVO: focus-visible:ring-2 — diagnóstico de UX apontou falta de indicador de foco
    // de teclado em botões (maior ganho de acessibilidade, menor esforço).
    "inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cda-blue/40 focus-visible:ring-offset-2",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  href,
  ...props
}: ButtonProps | LinkButtonProps) {
  if (href) {
    return (
      <Link href={href} className={baseClasses(variant, size, className)}>
        {children}
      </Link>
    );
  }

  return (
    <button
      className={baseClasses(variant, size, className)}
      disabled={disabled || loading}
      {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
