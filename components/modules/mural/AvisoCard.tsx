"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pin, PinOff, Trash2, Pencil } from "lucide-react";
import type { MuralAviso } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatarDataHora } from "@/lib/utils";
import { EditarAvisoModal } from "./EditarAvisoModal";

export function AvisoCard({ aviso, podeGerenciar }: { aviso: MuralAviso; podeGerenciar: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState("");

  async function alternarFixado() {
    setLoading(true);
    await fetch(`/api/mural/${aviso.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fixado: !aviso.fixado }),
    });
    setLoading(false);
    router.refresh();
  }

  async function excluir() {
    if (!confirm("Excluir este aviso?")) return;
    setLoading(true);
    const res = await fetch(`/api/mural/${aviso.id}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível excluir.");
      return;
    }
    router.refresh();
  }

  return (
    <Card className={aviso.fixado ? "border-cda-yellow/60 p-5" : "p-5"}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-cda-text">{aviso.titulo}</h3>
          {aviso.fixado && <Badge variant="amber">Fixado</Badge>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {podeGerenciar && (
            <button
              onClick={() => setEditando(true)}
              disabled={loading}
              title="Editar"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-cda-text2 hover:bg-cda-bg disabled:opacity-50"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={alternarFixado}
            disabled={loading}
            title={aviso.fixado ? "Desafixar" : "Fixar"}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-cda-text2 hover:bg-cda-bg disabled:opacity-50"
          >
            {aviso.fixado ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </button>
          {podeGerenciar && (
            <button
              onClick={excluir}
              disabled={loading}
              title="Excluir"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-cda-red hover:bg-cda-bg disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm text-cda-text2">{aviso.conteudo}</p>
      <p className="mt-3 text-xs text-cda-text3">
        {aviso.autor} · {formatarDataHora(aviso.createdAt)}
      </p>
      {erro && <p className="mt-2 text-xs text-cda-red">{erro}</p>}

      <EditarAvisoModal aviso={editando ? aviso : null} onClose={() => setEditando(false)} />
    </Card>
  );
}
