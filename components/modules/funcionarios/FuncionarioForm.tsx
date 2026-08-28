"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Funcionario } from "@prisma/client";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SETORES, formatarCPF, formatarTelefone } from "@/lib/utils";

/**
 * Formulário único de Novo/Editar funcionário (handoff de design, etapa 5).
 * Antes FuncionarioForm e EditarFuncionarioForm eram ~90% idênticos — mesma
 * ordem de campo, mesmo layout — e a duplicação era o vetor de divergência
 * futura (o criar não formatava CPF/telefone, o editar sim).
 */
export function FuncionarioForm({ funcionario }: { funcionario?: Funcionario }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const url = funcionario ? `/api/funcionarios/${funcionario.id}` : "/api/funcionarios";
    const method = funcionario ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
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
      setError(data.error ?? "Não foi possível salvar.");
      return;
    }

    const destino = funcionario ? funcionario.id : (await res.json()).id;
    router.push(`/funcionarios/${destino}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Card title="Dados do funcionário" className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Nome completo" name="nome" required defaultValue={funcionario?.nome} className="sm:col-span-2" />
          <Input
            label="CPF"
            name="cpf"
            defaultValue={funcionario?.cpf ? formatarCPF(funcionario.cpf) : ""}
            placeholder="000.000.000-00 (deixe em branco se não souber)"
          />
          <Input label="Cargo" name="cargo" required defaultValue={funcionario?.cargo} placeholder="Professora" />
          <Select label="Setor" name="setor" required defaultValue={funcionario?.setor ?? ""}>
            {!funcionario && (
              <option value="" disabled>
                Selecione o setor
              </option>
            )}
            {SETORES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Input
            label="Data de nascimento"
            name="dataNascimento"
            type="date"
            defaultValue={funcionario?.dataNascimento ? new Date(funcionario.dataNascimento).toISOString().slice(0, 10) : ""}
          />
          <Input
            label="Data de admissão"
            name="admissao"
            type="date"
            required
            defaultValue={funcionario ? new Date(funcionario.admissao).toISOString().slice(0, 10) : undefined}
          />
          <Input
            label="Telefone"
            name="telefone"
            defaultValue={funcionario?.telefone ? formatarTelefone(funcionario.telefone) : ""}
            placeholder="(55) 9 9999-9999"
          />
          <Input label="E-mail" name="email" type="email" defaultValue={funcionario?.email ?? ""} />
        </div>
        <p className="mt-3 text-xs text-cda-text3">
          Participação no Ponto e jornada prevista se configuram na tela de Ponto.
        </p>
      </Card>

      {error && <p className="text-sm text-cda-red">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {funcionario ? "Salvar alterações" : "Salvar funcionário"}
        </Button>
      </div>
    </form>
  );
}
