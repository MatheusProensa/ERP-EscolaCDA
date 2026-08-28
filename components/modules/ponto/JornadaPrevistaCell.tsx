"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/ui/Toast";
import { minParaHora } from "@/lib/ponto";

function horaValida(v: string): boolean {
  return /^\d{1,2}:\d{2}$/.test(v.trim());
}

/** Campo de "Jornada prevista" editável direto na listagem do Ponto — antes
 * só dava pra ver/editar abrindo o modal "Gerenciar participantes", e depois
 * de importar o histórico de várias pessoas de uma vez, preencher isso ali
 * uma a uma ficava melhor direto na tabela. */
export function JornadaPrevistaCell({
  funcionarioId,
  minutosIniciais,
}: {
  funcionarioId: string;
  minutosIniciais: number | null;
}) {
  const router = useRouter();
  const valorInicial = minutosIniciais != null ? minParaHora(minutosIniciais) : "";
  const [valor, setValor] = useState(valorInicial);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    const texto = valor.trim();
    if (texto === valorInicial) return;

    if (texto && !horaValida(texto)) {
      showToast(`Horário inválido: "${texto}". Use o formato HH:MM (ex.: 08:00).`, "error");
      setValor(valorInicial);
      return;
    }

    setSalvando(true);
    const res = await fetch(`/api/funcionarios/${funcionarioId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jornadaPrevista: texto || null }),
    });
    setSalvando(false);

    if (!res.ok) {
      showToast("Não foi possível salvar a jornada prevista.", "error");
      setValor(valorInicial);
      return;
    }
    showToast("Jornada prevista salva.");
    router.refresh();
  }

  return (
    <input
      type="text"
      value={valor}
      placeholder="ex.: 08:00"
      disabled={salvando}
      onChange={(e) => setValor(e.target.value)}
      onBlur={salvar}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className="h-8 w-24 rounded-md border border-cda-border px-2 text-center text-sm text-cda-text outline-none transition-colors focus:border-cda-blue disabled:opacity-50"
    />
  );
}
