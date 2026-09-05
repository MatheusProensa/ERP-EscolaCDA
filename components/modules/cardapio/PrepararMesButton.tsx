"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";

export function PrepararMesButton({
  ano,
  mes,
  mesAnterior,
}: {
  ano: number;
  mes: number;
  /** Mês/ano com cardápio cadastrado mais recente antes deste — se existir,
   * oferece copiar como ponto de partida em vez de começar em branco. */
  mesAnterior: { ano: number; mes: number; label: string } | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"vazio" | "copiar" | null>(null);

  async function preparar(copiarDe?: { ano: number; mes: number }) {
    setLoading(copiarDe ? "copiar" : "vazio");
    const res = await fetch("/api/cardapio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ano, mes, copiarDe }),
    });
    setLoading(null);
    if (!res.ok) {
      showToast("Não foi possível preparar o mês. Tente de novo.", "error");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {mesAnterior && (
        <Button variant="primary" onClick={() => preparar({ ano: mesAnterior.ano, mes: mesAnterior.mes })} loading={loading === "copiar"}>
          <Copy className="h-4 w-4" />
          Copiar de {mesAnterior.label}
        </Button>
      )}
      <Button variant="outline" onClick={() => preparar()} loading={loading === "vazio"}>
        <Plus className="h-4 w-4" />
        Preparar em branco
      </Button>
    </div>
  );
}
