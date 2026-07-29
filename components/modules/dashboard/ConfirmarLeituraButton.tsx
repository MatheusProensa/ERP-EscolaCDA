"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ConfirmarLeituraButton({
  avisoId,
  confirmadoInicial,
}: {
  avisoId: string;
  confirmadoInicial: boolean;
}) {
  const [confirmado, setConfirmado] = useState(confirmadoInicial);
  const [loading, setLoading] = useState(false);

  async function confirmar() {
    setLoading(true);
    const res = await fetch(`/api/mural/${avisoId}/leitura`, { method: "POST" });
    setLoading(false);
    if (res.ok) setConfirmado(true);
  }

  if (confirmado) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-cda-green">
        <Check className="h-4 w-4" /> Leitura confirmada
      </span>
    );
  }

  return (
    <Button
      onClick={confirmar}
      loading={loading}
      className="shrink-0 bg-cda-yellow text-cda-navy hover:bg-cda-yellow/90"
    >
      Confirmar leitura
    </Button>
  );
}
