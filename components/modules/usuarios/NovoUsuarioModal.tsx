"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ROLES_ATIVAS, ROLE_LABEL } from "@/lib/permissoes";

export function NovoUsuarioModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        password: fd.get("password"),
        role: fd.get("role"),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível criar o usuário.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Novo usuário
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo usuário">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Nome" name="name" required placeholder="Nome completo" />
          <Input label="Email" name="email" type="email" required placeholder="nome@escolacda.com.br" />
          <Input label="Senha" name="password" type="password" required minLength={6} placeholder="Mínimo 6 caracteres" />
          <Select label="Setor" name="role" required defaultValue="">
            <option value="" disabled>
              Selecione...
            </option>
            {ROLES_ATIVAS.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role]}
              </option>
            ))}
          </Select>
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Criar usuário
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
