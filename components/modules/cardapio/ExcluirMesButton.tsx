"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { showToast } from "@/components/ui/Toast";

export function ExcluirMesButton({ ano, mes, mesLabel }: { ano: number; mes: number; mesLabel: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(false);

  async function excluir() {
    setLoading(true);
    const res = await fetch(`/api/cardapio?ano=${ano}&mes=${mes}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      showToast("Não foi possível excluir. Tente de novo.", "error");
      return;
    }
    setConfirmando(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-cda-red hover:bg-cda-red/10"
      >
        <Trash2 className="h-4 w-4" />
        Excluir mês
      </button>
      <ConfirmDialog
        open={confirmando}
        onClose={() => setConfirmando(false)}
        onConfirm={excluir}
        title={`Excluir o cardápio de ${mesLabel}?`}
        consequence="Apaga o cardápio dos 3 públicos (Maternal/Pré, Berçário, Fundamental) cadastrado pra esse mês — inclusive o que já foi preenchido."
        confirmLabel="Excluir"
        loading={loading}
      />
    </>
  );
}
