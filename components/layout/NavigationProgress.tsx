"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Barra de progresso no topo da tela durante a navegação. O App Router não expõe
 * um evento de "início de navegação" (diferente do Pages Router), então detectamos
 * o clique em qualquer link interno diretamente e escondemos quando a rota muda —
 * dá feedback visual imediato no clique, sem depender do momento exato em que o
 * Suspense troca o loading.tsx pelo conteúdo real (isso o fade-in do template.tsx
 * já cobre, mas sozinho não bastava pra parecer suave).
 */
export function NavigationProgress() {
  const [ativo, setAtivo] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as HTMLElement)?.closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:")) return;
      setAtivo(true);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    // Rota mudou — navegação concluída. Pequeno atraso pra barra "chegar ao fim"
    // visualmente em vez de sumir de repente.
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setAtivo(false), 150);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[100] h-[3px] w-full overflow-hidden"
    >
      <div
        className={`h-full bg-cda-yellow transition-all ${
          ativo ? "w-[75%] duration-[2000ms] ease-out opacity-100" : "w-full duration-200 ease-in opacity-0"
        }`}
      />
    </div>
  );
}
