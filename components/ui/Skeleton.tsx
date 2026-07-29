import { cn } from "@/lib/utils";

/**
 * Placeholder de carregamento — use em `loading.tsx` de cada rota para
 * substituir a tela branca que pisca hoje enquanto o RSC busca dados.
 */
export function Skeleton({
  variant = "line",
  className,
  count = 1,
}: {
  variant?: "line" | "block" | "circle";
  className?: string;
  count?: number;
}) {
  const shape =
    variant === "circle" ? "rounded-full" : variant === "block" ? "rounded-lg" : "rounded";
  const defaultSize =
    variant === "circle" ? "h-9 w-9" : variant === "block" ? "h-20 w-full" : "h-3.5 w-full";

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "animate-pulse bg-cda-bg",
            shape,
            defaultSize,
            count > 1 && i < count - 1 && "mb-2",
            className
          )}
        />
      ))}
    </>
  );
}
