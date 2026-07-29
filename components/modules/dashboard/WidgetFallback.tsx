/** Placeholder pros widgets assíncronos do dashboard (Calendário, Mural) dentro de um
 * <Suspense> — deixa o resto do dashboard renderizar sem esperar essas queries extras. */
export function WidgetFallback({ className = "h-64" }: { className?: string }) {
  return (
    <div className={`rounded-[10px] border border-cda-border bg-cda-surface p-5 ${className}`}>
      <div className="h-4 w-1/3 animate-pulse rounded bg-cda-border" />
    </div>
  );
}
