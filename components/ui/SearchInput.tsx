"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

/**
 * Campo de busca com debounce (~300ms) que atualiza a URL (?busca=...), disparando
 * o refetch server-side já existente na página (searchParams). Substitui o <input>
 * simples dentro do <form> das telas de listagem (Alunos, Funcionários) — hoje
 * elas só filtram no submit do formulário, exigindo um clique extra em "Filtrar".
 *
 * Uso: <SearchInput paramName="busca" placeholder="Buscar por nome..." />
 */
export function SearchInput({
  paramName = "busca",
  placeholder = "Buscar...",
}: {
  paramName?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(paramName) ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(paramName, value);
      else params.delete(paramName);
      router.replace(`${pathname}?${params.toString()}`);
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cda-text3" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-lg border border-cda-border bg-white pl-9 pr-3 text-sm text-cda-text placeholder:text-cda-text3 outline-none transition-colors focus:border-cda-blue"
      />
    </div>
  );
}
