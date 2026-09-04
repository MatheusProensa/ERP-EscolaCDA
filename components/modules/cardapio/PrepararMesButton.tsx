"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";

export function PrepararMesButton({ ano, mes }: { ano: number; mes: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function preparar() {
    setLoading(true);
    const res = await fetch("/api/cardapio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ano, mes }),
    });
    setLoading(false);
    if (!res.ok) {
      showToast("Não foi possível preparar o mês. Tente de novo.", "error");
      return;
    }
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={preparar} loading={loading}>
      <Plus className="h-4 w-4" />
      Preparar este mês
    </Button>
  );
}
