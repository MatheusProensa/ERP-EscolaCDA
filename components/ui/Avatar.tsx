import { corAvatar, iniciais } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function Avatar({
  nome,
  foto,
  size = "md",
  className,
}: {
  nome: string;
  foto?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-7 w-7 text-[11px]",
    md: "h-9 w-9 text-xs",
    lg: "h-12 w-12 text-sm",
    xl: "h-24 w-24 text-2xl",
  };

  if (foto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={foto}
        alt={nome}
        className={cn("shrink-0 rounded-full object-cover", sizeClasses[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: corAvatar(nome) }}
    >
      {iniciais(nome)}
    </div>
  );
}
