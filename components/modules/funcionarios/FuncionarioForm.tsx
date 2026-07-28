"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SETORES } from "@/lib/utils";

export function FuncionarioForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/funcionarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: fd.get("nome"),
        cpf: fd.get("cpf"),
        cargo: fd.get("cargo"),
        setor: fd.get("setor"),
        telefone: fd.get("telefone"),
        email: fd.get("email"),
        admissao: fd.get("admissao"),
        dataNascimento: fd.get("dataNascimento") || null,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar o funcionário.");
      return;
    }

    const funcionario = await res.json();
    router.push(`/funcionarios/${funcionario.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Card title="Dados do funcionário" className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Nome completo" name="nome" required className="sm:col-span-2" />
          <Input label="CPF" name="cpf" required placeholder="000.000.000-00" />
          <Input label="Data de admissão" name="admissao" type="date" required />
          <Input label="Data de nascimento" name="dataNascimento" type="date" />
          <Input label="Cargo" name="cargo" required placeholder="Professora" />
          <Select label="Setor" name="setor" required defaultValue="">
            <option value="" disabled>
              Selecione o setor
            </option>
            {SETORES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Input label="Telefone" name="telefone" placeholder="(55) 9 9999-9999" />
          <Input label="E-mail" name="email" type="email" />
        </div>
        <p className="mt-3 text-xs text-cda-text3">
          Participação no controle de Ponto e jornada prevista se configuram na tela de Ponto, depois do cadastro.
        </p>
      </Card>

      {error && <p className="text-sm text-cda-red">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          Salvar funcionário
        </Button>
      </div>
    </form>
  );
}
