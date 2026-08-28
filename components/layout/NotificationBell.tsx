"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { formatarDataHora } from "@/lib/utils";

type Notificacao = {
  id: string;
  tipo: string;
  titulo: string;
  corpo: string | null;
  link: string | null;
  lida: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      if (document.hidden) return;
      const res = await fetch("/api/notificacoes");
      if (!res.ok || cancelado) return;
      const data = await res.json();
      setNotificacoes(data.notificacoes);
      setNaoLidas(data.naoLidas);
    }

    carregar();
    const intervalo = setInterval(carregar, 20000);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function abrir() {
    setOpen((v) => !v);
    if (naoLidas > 0) {
      setNaoLidas(0);
      setNotificacoes((atual) => atual.map((n) => ({ ...n, lida: true })));
      await fetch("/api/notificacoes", { method: "PATCH" });
    }
  }

  function clicarItem(n: Notificacao) {
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={abrir}
        aria-label={`Notificações${naoLidas > 0 ? ` (${naoLidas} não lidas)` : ""}`}
        aria-expanded={open}
        className="relative flex h-11 w-11 items-center justify-center rounded-lg text-cda-text2 hover:bg-cda-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cda-blue/40"
      >
        <Bell className="h-[18px] w-[18px]" />
        {naoLidas > 0 && (
          <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-cda-red" />
        )}
      </button>

      {open && (
        // No celular vira painel fixo quase full-width (não ancorado no botão) —
        // com w-80 fixo o painel nascia grudado na direita do sino e estourava
        // pra fora da tela pela esquerda em telas estreitas. Do sm: pra cima
        // volta a ser o dropdown ancorado de sempre.
        <div className="fixed inset-x-3 top-14 z-50 rounded-lg border border-cda-border bg-white shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-80">
          <div className="border-b border-cda-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-cda-text3">
            Notificações
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notificacoes.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-cda-text3">Nenhuma notificação ainda.</p>
            )}
            {notificacoes.map((n) => (
              <button
                key={n.id}
                onClick={() => clicarItem(n)}
                className="flex w-full flex-col gap-0.5 border-b border-cda-border px-4 py-2.5 text-left last:border-0 hover:bg-cda-bg"
              >
                <span className="text-sm font-medium text-cda-text">{n.titulo}</span>
                {n.corpo && <span className="truncate text-xs text-cda-text2">{n.corpo}</span>}
                <span className="text-[11px] text-cda-text3">{formatarDataHora(n.createdAt)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
