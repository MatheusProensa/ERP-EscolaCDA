"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { showToast } from "@/components/ui/Toast";

/** Tile tracejado + modal simples (só o título) — entra sempre em branco,
 * pra completar depois pelo "Editar" que já existe em cada card (mesmo
 * espírito do "Preparar em branco" do Cardápio: nunca inventa horário,
 * pessoa ou texto que a escola não confirmou). */
export function NovoBlocoButton({
  ano,
  tipo,
  label,
  placeholder,
}: {
  ano: number;
  tipo: "TURNO" | "NOTA";
  label: string;
  placeholder: string;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [loading, setLoading] = useState(false);

  async function criar(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/horarios-equipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ano, tipo, titulo }),
    });
    setLoading(false);
    if (!res.ok) {
      showToast("Não foi possível criar. Tente de novo.", "error");
      return;
    }
    setAberto(false);
    setTitulo("");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex min-h-[120px] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-cda-border text-sm font-medium text-cda-text3 hover:border-cda-blue hover:text-cda-blue"
      >
        <Plus className="h-5 w-5" />
        {label}
      </button>
      <Modal open={aberto} onClose={() => setAberto(false)} title={label}>
        <form onSubmit={criar} className="flex flex-col gap-4">
          <Input
            label="Título"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={placeholder}
            autoFocus
            required
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Criar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
