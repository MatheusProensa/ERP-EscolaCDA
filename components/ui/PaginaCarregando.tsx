import { Skeleton } from "./Skeleton";

/**
 * Esqueleto genérico pra `loading.tsx` de cada rota — o Skeleton já existia
 * no kit ("use em loading.tsx de cada rota") mas nenhuma página realmente
 * tinha um `loading.tsx` (achado da auditoria visual de set/2026): trocar de
 * tela ficava com a tela anterior parada, sem nenhum feedback, até o
 * Server Component terminar de buscar no banco — pior ainda em página com
 * busca/filtro (Alunos, Funcionários...), onde parece que o clique não fez
 * nada. Três formatos cobrem a maioria das telas do sistema sem precisar de
 * um esqueleto pixel-perfeito por página — só o suficiente pra não piscar
 * telas branca e não pular o layout quando o conteúdo real chega.
 */
export function PaginaCarregando({
  variant = "tabela",
  linhas = 6,
}: {
  variant?: "tabela" | "cartoes" | "painel";
  linhas?: number;
}) {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Skeleton className="mb-2 h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton variant="block" className="h-10 w-36" />
      </div>

      {variant === "tabela" && (
        <>
          <Skeleton variant="block" className="mb-5 h-16" />
          <div className="rounded-[10px] border border-cda-border bg-white p-5">
            <Skeleton count={linhas} className="h-10" />
          </div>
        </>
      )}

      {variant === "cartoes" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: linhas }).map((_, i) => (
            <Skeleton key={i} variant="block" className="h-32" />
          ))}
        </div>
      )}

      {variant === "painel" && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="block" className="h-20" />
            ))}
          </div>
          <Skeleton variant="block" className="h-72" />
        </>
      )}
    </div>
  );
}
