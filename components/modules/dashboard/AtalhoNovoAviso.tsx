"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { NovoAvisoForm } from "@/components/modules/mural/NovoAvisoForm";

/** Botão "Novo aviso" — vive no action do card do Mural (Dashboard), do lado
 * de "Ver mural". Antes era um atalho grande e separado junto de Chat/Novo
 * aluno/Novo funcionário — o dono do sistema achou que isso duplicava a
 * navegação (Chat já tem ícone próprio na topbar) e misturava ações raras
 * (matricular aluno) com o que se usa toda hora. Ficou só este, junto do
 * conteúdo que ele afeta. */
export function AtalhoNovoAviso() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        Novo aviso
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo aviso">
        <NovoAvisoForm
          onCancel={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </>
  );
}
