"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Funcionario } from "@prisma/client";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SETORES, formatarCPF, formatarTelefone } from "@/lib/utils";
import { minParaHora } from "@/lib/ponto";

export function EditarFuncionarioForm({ funcionario }: { funcionario: Funcionario }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/funcionarios/${funcionario.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: fd.get("nome"),
        cpf: fd.get("cpf"),
        cargo: fd.get("cargo"),
        setor: fd.get("setor"),
        telefone: fd.get("telefone"),
        email: fd.get("email"),
        dataNascimento: fd.get("dataNascimento") || null,
        jornadaPrevista: fd.get("jornadaPrevista") || null,
        participaPonto: fd.get("participaPonto") === "on",
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar as alterações.");
      return;
    }

    router.push(`/funcionarios/${funcionario.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Card title="Dados do funcionário" className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Nome completo" name="nome" required defaultValue={funcionario.nome} className="sm:col-span-2" />
          <Input label="CPF" name="cpf" required defaultValue={formatarCPF(funcionario.cpf)} placeholder="000.000.000-00" />
          <Input label="Cargo" name="cargo" required defaultValue={funcionario.cargo} />
          <Input
            label="Data de nascimento"
            name="dataNascimento"
            type="date"
            defaultValue={funcionario.dataNascimento ? new Date(funcionario.dataNascimento).toISOString().slice(0, 10) : ""}
          />
          <Select label="Setor" name="setor" required defaultValue={funcionario.setor}>
            {SETORES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Input
            label="Telefone"
            name="telefone"
            defaultValue={funcionario.telefone ? formatarTelefone(funcionario.telefone) : ""}
            placeholder="(55) 9 9999-9999"
          />
          <Input label="E-mail" name="email" type="email" defaultValue={funcionario.email ?? ""} />
          <Input
            label="Jornada prevista (por dia)"
            name="jornadaPrevista"
            placeholder="04:30"
            pattern="\d{1,2}:\d{2}"
            title="Formato HH:MM, ex.: 04:30"
            defaultValue={funcionario.jornadaPrevistaMinutos != null ? minParaHora(funcionario.jornadaPrevistaMinutos) : ""}
          />
          <label className="flex items-center gap-2 text-sm text-cda-text2 sm:col-span-2">
            <input
              type="checkbox"
              name="participaPonto"
              defaultChecked={funcionario.participaPonto}
              className="h-4 w-4 rounded border-cda-border"
            />
            Participa do controle de Ponto
          </label>
        </div>
      </Card>

      {error && <p className="text-sm text-cda-red">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          Salvar alterações
        </Button>
      </div>
    </form>
  );
}
