"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pin, PinOff, Trash2, Pencil } from "lucide-react";
import type { MuralAviso } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatarDataHora } from "@/lib/utils";
import { ConfirmarLeituraButton } from "@/components/modules/dashboard/ConfirmarLeituraButton";
import { EditarAvisoModal } from "./EditarAvisoModal";

export function AvisoCard({
  aviso,
  podeGerenciar,
  totalLeituras,
  confirmadoInicial,
}: {
  aviso: MuralAviso;
  podeGerenciar: boolean;
  totalLeituras: number;
  confirmadoInicial: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
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
    setLoading(true);
    const res = await fetch(`/api/mural/${aviso.id}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível excluir.");
      return;
    }
    setConfirmandoExclusao(false);
    router.refresh();
  }

  return (
    <Card className="p-5" emphasis={aviso.fixado ? "brand" : undefined}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-cda-text">{aviso.titulo}</h3>
          {aviso.fixado && <Badge variant="warning">Fixado</Badge>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {podeGerenciar && (
            <IconButton icon={Pencil} label="Editar aviso" size="sm" disabled={loading} onClick={() => setEditando(true)} />
          )}
          <IconButton
            icon={aviso.fixado ? PinOff : Pin}
            label={aviso.fixado ? "Desafixar aviso" : "Fixar aviso"}
            size="sm"
            disabled={loading}
            onClick={alternarFixado}
          />
          {podeGerenciar && (
            <IconButton
              icon={Trash2}
              label="Excluir aviso"
              variant="danger"
              size="sm"
              disabled={loading}
              onClick={() => setConfirmandoExclusao(true)}
            />
          )}
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm text-cda-text2">{aviso.conteudo}</p>
      <p className="mt-3 text-xs text-cda-text3">
        {aviso.autor} · {formatarDataHora(aviso.createdAt)}
      </p>
      {erro && <p className="mt-2 text-xs text-cda-red">{erro}</p>}

      {aviso.fixado && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-cda-border pt-3">
          <span className="text-xs text-cda-text3">{totalLeituras} confirmaram a leitura</span>
          <ConfirmarLeituraButton avisoId={aviso.id} confirmadoInicial={confirmadoInicial} />
        </div>
      )}

      <EditarAvisoModal aviso={editando ? aviso : null} onClose={() => setEditando(false)} />

      <ConfirmDialog
        open={confirmandoExclusao}
        onClose={() => setConfirmandoExclusao(false)}
        onConfirm={excluir}
        title="Excluir este aviso?"
        confirmLabel="Excluir aviso"
        loading={loading}
      />
    </Card>
  );
}
