"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

type Usuario = { id: string; name: string };

/** Lista de quem confirmou a leitura de um aviso e quem ainda falta —
 * abre sob demanda (não carrega até o gestor clicar), já que só faz sentido
 * pra quem pode gerenciar o mural. */
export function LeiturasAvisoModal({ avisoId, open, onClose }: { avisoId: string; open: boolean; onClose: () => void }) {
  const [carregando, setCarregando] = useState(true);
  const [leram, setLeram] = useState<Usuario[]>([]);
  const [naoLeram, setNaoLeram] = useState<Usuario[]>([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelado = false;
    async function carregar() {
      setCarregando(true);
      setErro("");
      const res = await fetch(`/api/mural/${avisoId}/leituras`);
      if (cancelado) return;
      if (!res.ok) {
        setCarregando(false);
        setErro("Não foi possível carregar quem leu esse aviso.");
        return;
      }
      const data = await res.json();
      if (cancelado) return;
      setLeram(data.leram);
      setNaoLeram(data.naoLeram);
      setCarregando(false);
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [open, avisoId]);

  return (
    <Modal open={open} onClose={onClose} title="Quem confirmou a leitura">
      {carregando ? (
        <p className="text-sm text-cda-text3">Carregando...</p>
      ) : erro ? (
        <p className="text-sm text-cda-red">{erro}</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-cda-text2">Confirmaram ({leram.length})</p>
            <div className="flex flex-col gap-1">
              {leram.map((u) => (
                <div key={u.id} className="flex items-center gap-2 text-sm text-cda-text">
                  <CheckCircle2 className="h-3.5 w-3.5 text-cda-green" />
                  {u.name}
                </div>
              ))}
              {leram.length === 0 && <p className="text-xs text-cda-text3">Ninguém ainda.</p>}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-cda-text2">Ainda faltam ({naoLeram.length})</p>
            <div className="flex flex-col gap-1">
              {naoLeram.map((u) => (
                <div key={u.id} className="flex items-center gap-2 text-sm text-cda-text2">
                  <Circle className="h-3.5 w-3.5 text-cda-text3" />
                  {u.name}
                </div>
              ))}
              {naoLeram.length === 0 && <p className="text-xs text-cda-text3">Todo mundo já confirmou! 🎉</p>}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
