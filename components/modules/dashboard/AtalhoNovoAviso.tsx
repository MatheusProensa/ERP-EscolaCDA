"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NovoAvisoForm } from "@/components/modules/mural/NovoAvisoForm";

/** Atalho "Novo aviso" do Dashboard — mesmo visual (e mesma cor categórica de
 * "Mural") dos chips de AtalhosRapidos, mas abre o modal de criação direto em
 * vez de só navegar pro Mural (era exatamente o mesmo link que já existe na
 * sidebar, sem ganho nenhum). */
export function AtalhoNovoAviso() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2.5 rounded-xl border border-cda-border bg-white px-4 py-3 text-sm font-medium text-cda-text shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md sm:justify-start"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: "var(--cat-4-bg)" }}>
          <Megaphone className="h-4 w-4" style={{ color: "var(--cat-4-text)" }} strokeWidth={2.25} />
        </span>
        Novo aviso
      </button>

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
