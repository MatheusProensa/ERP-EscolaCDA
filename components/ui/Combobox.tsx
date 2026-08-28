"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";

function semAcento(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Select com filtro por digitação (handoff de design, etapa 6). Em repouso é
 * visualmente IDÊNTICO ao <Select> (40px, raio 8px, chevron à direita) para
 * não criar um segundo dialeto de campo.
 *
 * Consumidores:
 *   ChaveCard "Responsável pela retirada" (funcionários) ·
 *   MatricularNaTurmaModal · GerenciarParticipantesModal · PontoMesForm
 *   (seletor de funcionário) · NovoBoletoModal e NovaNotaFiscalModal
 *   (seletor de aluno)
 *
 * OBS.: o campo do ChaveCard NUNCA foi texto livre — já era um <Select> ligado
 * ao cadastro de Funcionários. O que faltava era poder digitar para filtrar.
 */
export function Combobox<T>({
  items,
  value,
  onChange,
  getId,
  getLabel,
  getSecondary,
  getAvatar,
  label,
  placeholder = "Digite para buscar...",
  hint = "Digite parte do nome para achar rápido.",
  required,
  disabled,
  error,
  emptyMessage = "Nada encontrado com esse nome.",
  countNoun = "itens",
}: {
  items: T[];
  value: string | null;
  onChange: (id: string | null) => void;
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  getSecondary?: (item: T) => string | undefined;
  getAvatar?: (item: T) => { nome: string; foto?: string | null } | undefined;
  label?: React.ReactNode;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  emptyMessage?: string;
  /** "funcionários", "alunos"… usado no cabeçalho da lista. */
  countNoun?: string;
}) {
  const listboxId = useId();
  const selecionado = items.find((i) => getId(i) === value) ?? null;
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [indice, setIndice] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtrados = useMemo(() => {
    if (!busca.trim()) return items;
    const alvo = semAcento(busca);
    return items.filter((i) => semAcento(getLabel(i)).includes(alvo));
  }, [items, busca, getLabel]);

  useEffect(() => {
    function fora(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setAberto(false);
        setBusca("");
      }
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  function buscar(valor: string) {
    setBusca(valor);
    setIndice(0);
    setAberto(true);
  }

  function escolher(item: T) {
    onChange(getId(item));
    setAberto(false);
    setBusca("");
  }

  function teclado(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAberto(true);
      setIndice((i) => Math.min(i + 1, filtrados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndice((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (aberto && filtrados[indice]) {
        e.preventDefault();
        escolher(filtrados[indice]);
      }
    } else if (e.key === "Escape") {
      setAberto(false);
      setBusca("");
    }
  }

  // O rótulo inteiro fica dentro de UM elemento. Se <b> e o resto do texto forem
  // irmãos diretos de um container flex com gap, o gap entra no meio da palavra.
  function destacar(texto: string) {
    if (!busca.trim()) return texto;
    const i = semAcento(texto).indexOf(semAcento(busca));
    if (i < 0) return texto;
    return (
      <>
        {texto.slice(0, i)}
        <b className="font-semibold">{texto.slice(i, i + busca.length)}</b>
        {texto.slice(i + busca.length)}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-text-body">
          {label}
          {required && <span className="ml-0.5 text-status-danger">*</span>}
        </label>
      )}

      <div className="relative" ref={wrapRef}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            role="combobox"
            aria-expanded={aberto}
            aria-controls={listboxId}
            aria-autocomplete="list"
            disabled={disabled}
            value={aberto ? busca : selecionado ? getLabel(selecionado) : ""}
            placeholder={placeholder}
            onFocus={() => setAberto(true)}
            onChange={(e) => buscar(e.target.value)}
            onKeyDown={teclado}
            className={cn(
              "h-10 w-full rounded-[var(--radius-control)] border bg-white pl-9 pr-9 text-sm text-text-heading outline-none transition-colors placeholder:text-text-muted focus:border-border-focus disabled:opacity-50",
              error ? "border-border-danger" : "border-border-default"
            )}
          />
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        </div>

        {aberto && (
          <div
            id={listboxId}
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-[var(--radius-control)] border border-border-default bg-white shadow-lg"
          >
            <div className="bg-surface-app px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              {filtrados.length} de {items.length} {countNoun}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {filtrados.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-text-muted">{emptyMessage}</p>
              )}
              {filtrados.map((item, i) => {
                const av = getAvatar?.(item);
                const sec = getSecondary?.(item);
                return (
                  <button
                    key={getId(item)}
                    type="button"
                    role="option"
                    aria-selected={i === indice}
                    onMouseEnter={() => setIndice(i)}
                    onClick={() => escolher(item)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm",
                      i === indice ? "bg-cat-1/10" : "hover:bg-surface-app"
                    )}
                  >
                    {av && <Avatar nome={av.nome} foto={av.foto} size="sm" />}
                    <span className="min-w-0 flex-1 truncate text-text-heading">{destacar(getLabel(item))}</span>
                    {sec && <span className="shrink-0 pl-2 text-xs text-text-muted">{sec}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {error ? (
        <span className="text-xs text-status-danger">{error}</span>
      ) : (
        hint && <span className="text-xs text-text-muted">{hint}</span>
      )}
    </div>
  );
}
