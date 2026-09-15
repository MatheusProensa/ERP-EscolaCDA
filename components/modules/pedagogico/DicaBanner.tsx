"use client";

import { useState, useSyncExternalStore } from "react";
import { Lightbulb, X } from "lucide-react";

const CHAVE_STORAGE = "cda-pedagogico-dica-fechada";

function subscribe() {
  return () => {};
}
function getSnapshot() {
  try {
    return localStorage.getItem(CHAVE_STORAGE) === "1";
  } catch {
    return false;
  }
}
function getServerSnapshot() {
  return false;
}

/** Banner de dica fechável no rodapé da Área Pedagógica — pedido do dono,
 * redesign da tela inicial. Lembra que foi fechado só nesse navegador
 * (localStorage, conveniência por pessoa — não é dado importante o
 * suficiente pra guardar no servidor, e cada professora só precisa ver
 * "aprenda a puxar o Roteiro do Planejamento" uma vez).
 *
 * `useSyncExternalStore` em vez de `useEffect` + `setState` — é o jeito
 * certo (React 18+) de ler um sistema externo (localStorage) sem cair no
 * erro de lint "setState síncrono dentro de effect" nem em mismatch de
 * hidratação (getServerSnapshot sempre retorna "aberto"). */
export function DicaBanner({ texto }: { texto: string }) {
  const fechadoStorage = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [fechadoAgora, setFechadoAgora] = useState(false);
  const fechado = fechadoStorage || fechadoAgora;

  if (fechado) return null;

  function fechar() {
    setFechadoAgora(true);
    try {
      localStorage.setItem(CHAVE_STORAGE, "1");
    } catch {
      // Storage bloqueado (aba anônima etc.) — fecha só nessa visita, sem quebrar nada.
    }
  }

  return (
    <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-cda-blue/20 bg-cda-blue/5 px-4 py-3">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-cda-blue" />
      <p className="flex-1 text-sm text-cda-text2">{texto}</p>
      <button type="button" onClick={fechar} aria-label="Fechar dica" className="shrink-0 text-cda-text3 hover:text-cda-text2">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
