"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function NovaChaveModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await fetch("/api/chaves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sala: fd.get("sala") }),
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nova chave
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova chave / sala">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Sala" name="sala" required placeholder="Laboratório de Informática" />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
