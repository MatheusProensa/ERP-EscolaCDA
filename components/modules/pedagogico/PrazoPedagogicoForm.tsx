"use client";

import { useState } from "react";
import { CalendarClock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";

function formatarData(iso: string): string {
  const data = new Date(`${iso}T00:00:00.000Z`);
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

/** Prazo do mês, definido pela coordenadora (pedido do dono, set/2026:
 * "coordenadora define o prazo do mês"). Compacto — mostra o prazo atual e
 * um lápis pra editar, sem modal. */
export function PrazoPedagogicoForm({ anoMes, dataLimiteInicial }: { anoMes: string; dataLimiteInicial: string | null }) {
  const [dataLimite, setDataLimite] = useState(dataLimiteInicial);
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(dataLimiteInicial ?? "");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!valor) return;
    setSalvando(true);
    const res = await fetch("/api/prazos-pedagogicos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mes: anoMes, dataLimite: valor }),
    });
    setSalvando(false);
    if (!res.ok) {
      showToast("Não foi possível salvar o prazo.");
      return;
    }
    setDataLimite(valor);
    setEditando(false);
    showToast("Prazo do mês atualizado.");
  }

  if (editando) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-cda-text2">
        <CalendarClock className="h-3.5 w-3.5 text-cda-blue" />
        <input
          type="date"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="rounded-md border border-cda-border px-2 py-1 text-xs outline-none focus:border-cda-blue"
        />
        <Button size="sm" onClick={salvar} loading={salvando} disabled={!valor}>
          Salvar
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditando(false)} disabled={salvando}>
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <button type="button" onClick={() => setEditando(true)} className="flex items-center gap-1.5 text-xs font-medium text-cda-text2 hover:text-cda-blue">
      <CalendarClock className="h-3.5 w-3.5" />
      {dataLimite ? `Prazo desse mês: ${formatarData(dataLimite)}` : "Definir prazo desse mês"}
      <Pencil className="h-3 w-3" />
    </button>
  );
}
