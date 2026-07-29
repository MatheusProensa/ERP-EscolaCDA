/**
 * Loading genérico pra todo o grupo (erp) — sem isso, o Next.js trava a navegação
 * em branco até o Server Component da página de destino terminar de buscar dados,
 * e a troca "estala" de uma vez. Com isso, o feedback aparece na hora do clique.
 *
 * Os blocos ficam dentro de cards brancos com uma barra cinza pulsando por dentro —
 * o componente Skeleton genérico usa bg-cda-bg, a mesma cor do fundo da página, o
 * que o deixava invisível aqui (fica só visível quando tem um fundo branco atrás).
 */
export default function Loading() {
  return (
    <div>
      <div className="mb-1 h-3 w-32 animate-pulse rounded bg-cda-border" />
      <div className="mb-5 h-8 w-64 animate-pulse rounded bg-cda-border" />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex h-28 items-center justify-center rounded-[10px] border border-cda-border bg-cda-surface p-5">
            <div className="h-4 w-2/3 animate-pulse rounded bg-cda-border" />
          </div>
        ))}
      </div>

      <div className="h-72 rounded-[10px] border border-cda-border bg-cda-surface p-5">
        <div className="h-4 w-1/4 animate-pulse rounded bg-cda-border" />
      </div>
    </div>
  );
}
