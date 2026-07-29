import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Loading genérico pra todo o grupo (erp) — sem isso, o Next.js trava a navegação
 * em branco até o Server Component da página de destino terminar de buscar dados,
 * e a troca "estala" de uma vez (parece um corte seco mesmo com fade-in no AppShell).
 * Com isso, o feedback aparece na hora do clique.
 */
export default function Loading() {
  return (
    <div>
      <Skeleton className="mb-1 h-3 w-32" />
      <Skeleton className="mb-5 h-8 w-64" />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton variant="block" className="h-28" />
        <Skeleton variant="block" className="h-28" />
        <Skeleton variant="block" className="h-28" />
        <Skeleton variant="block" className="h-28" />
      </div>

      <Skeleton variant="block" className="h-72" />
    </div>
  );
}
