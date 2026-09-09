"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { FilterSelect, type FilterSelectOption } from "./FilterSelect";

export type BarraFiltroSelect = {
  paramName: string;
  placeholder: string;
  options: FilterSelectOption[];
  /** Valor a mostrar quando o parâmetro não está na URL — pra telas onde a
   * ausência do parâmetro não significa "sem filtro" e sim "usa o padrão do
   * servidor" (ex.: Aniversariantes sem `?mes=` mostra o mês atual, não
   * "todos os meses" — esse valor evita o select mostrar o placeholder
   * enquanto o mês atual já está de fato selecionado). */
  valorPadrao?: string;
};

export type BarraFiltroCheckbox = {
  paramName: string;
  value: string;
  label: string;
};

/**
 * Barra de filtro única pra listagens — substitui os 4 dialetos diferentes que
 * o sistema tinha (Select nativo + botão "Filtrar", FilterSelect isolado sem
 * busca, formulário GET, SearchInput sem os outros filtros junto). Achado de
 * auditoria externa (set/2026): ver
 * docs/auditoria-design-set2026/recomendacao-filtro-e-pessoas.md.
 *
 * Busca com debounce de ~300ms + um FilterSelect por dimensão (aplica na hora,
 * sem botão) + checkboxes opcionais (aplicam na hora) + contador "N de M" +
 * "Limpar filtros" (só aparece com algum filtro ativo; limpa só os parâmetros
 * que ESSA barra controla — não mexe em parâmetro de fora, tipo paginação).
 * Tudo em `router.replace` (não `push`), pra não poluir o histórico a cada
 * tecla digitada — mesmo cuidado que o SearchInput já tinha.
 */
export function BarraFiltro({
  buscaParam = "busca",
  buscaPlaceholder,
  selects = [],
  checkboxes = [],
  total,
  totalGeral,
  paginaParam,
}: {
  buscaParam?: string;
  /** Some da barra quando omitido — nem toda listagem precisa de busca livre
   * (ex.: Aniversariantes só filtra por mês). */
  buscaPlaceholder?: string;
  selects?: BarraFiltroSelect[];
  checkboxes?: BarraFiltroCheckbox[];
  /** Quantos resultados o filtro atual devolveu. Omitido quando a tela tem
   * mais de uma lista embaixo (ex.: Aniversariantes: Alunos/Funcionários/
   * Aniversário de empresa) — aí um "N de M" só não representa nada. */
  total?: number;
  /** Quantos existem no total, sem filtro nenhum — pra "12 de 128" dizer algo,
   * não só "12 resultados" (aí não dá pra saber se filtrou bem ou se o
   * cadastro é que tá vazio). */
  totalGeral?: number;
  /** Nome do parâmetro de página, quando a listagem pagina (ex.: Log de
   * Atividades). Some do zero toda vez que um filtro muda — senão a pessoa
   * fica presa numa página que não existe mais pro resultado filtrado. */
  paginaParam?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [busca, setBusca] = useState(searchParams.get(buscaParam) ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (busca) params.set(buscaParam, busca);
      else params.delete(buscaParam);
      if (paginaParam) params.delete(paginaParam);
      router.replace(`${pathname}?${params.toString()}`);
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  function setParam(nome: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (valor) params.set(nome, valor);
    else params.delete(nome);
    if (paginaParam) params.delete(paginaParam);
    router.replace(`${pathname}?${params.toString()}`);
  }

  function toggleCheckbox(cb: BarraFiltroCheckbox) {
    const ativo = searchParams.get(cb.paramName) === cb.value;
    setParam(cb.paramName, ativo ? "" : cb.value);
  }

  const paramsControlados = [
    ...(buscaPlaceholder ? [buscaParam] : []),
    ...selects.map((s) => s.paramName),
    ...checkboxes.map((c) => c.paramName),
  ];
  const temFiltroAtivo = paramsControlados.some((p) => searchParams.get(p));

  function limparFiltros() {
    const params = new URLSearchParams(searchParams.toString());
    paramsControlados.forEach((p) => params.delete(p));
    if (paginaParam) params.delete(paginaParam);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    setBusca("");
  }

  return (
    <div className="mb-5 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {buscaPlaceholder && (
          <div className="relative w-full sm:w-[260px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cda-text3" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={buscaPlaceholder}
              aria-label={buscaPlaceholder}
              className="h-10 w-full rounded-lg border border-cda-border bg-white pl-9 pr-8 text-base text-cda-text placeholder:text-cda-text3 outline-none transition-colors focus:border-cda-blue sm:text-sm"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                aria-label="Limpar busca"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cda-text3 hover:text-cda-text"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
        {selects.map((s) => (
          <FilterSelect
            key={s.paramName}
            value={searchParams.get(s.paramName) ?? s.valorPadrao ?? ""}
            onChange={(v) => setParam(s.paramName, v)}
            options={s.options}
            placeholder={s.placeholder}
            className="w-full sm:w-[200px]"
          />
        ))}
        {temFiltroAtivo && (
          <button type="button" onClick={limparFiltros} className="text-xs font-medium text-cda-text3 underline hover:text-cda-text2">
            Limpar filtros
          </button>
        )}
        {total !== undefined && totalGeral !== undefined && (
          <span className="text-xs text-cda-text3 sm:ml-auto">
            {total} de {totalGeral}
          </span>
        )}
      </div>
      {checkboxes.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {checkboxes.map((cb) => (
            <label key={cb.paramName} className="flex items-center gap-2 text-sm text-cda-text2">
              <input
                type="checkbox"
                checked={searchParams.get(cb.paramName) === cb.value}
                onChange={() => toggleCheckbox(cb)}
                className="h-4 w-4 rounded border-cda-border"
              />
              {cb.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
