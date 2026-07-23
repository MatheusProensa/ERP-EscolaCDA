"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { RegistroPonto } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { formatarMinutos, paraMinutos } from "@/lib/ponto";

const OCORRENCIAS = [
  { value: "NORMAL", label: "Normal" },
  { value: "FALTA", label: "Falta" },
  { value: "FERIADO", label: "Feriado" },
  { value: "FERIAS", label: "Férias" },
  { value: "ATESTADO", label: "Atestado" },
  { value: "FOLGA", label: "Folga" },
  { value: "DSR", label: "DSR" },
];

export function NovoRegistroPontoModal({
  funcionarioId,
  open,
  onClose,
  registro,
}: {
  funcionarioId: string;
  open: boolean;
  onClose: () => void;
  registro?: RegistroPonto | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const editando = !!registro;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const previstoStr = String(fd.get("previsto") || "").trim();
    // Em edição a data fica travada (disabled), então inputs desabilitados não
    // entram no FormData — usa a data original do registro nesse caso.
    const data = registro ? dataDefault : fd.get("data");

    const res = await fetch("/api/ponto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        funcionarioId,
        data,
        entrada1: fd.get("entrada1"),
        saida1: fd.get("saida1"),
        entrada2: fd.get("entrada2"),
        saida2: fd.get("saida2"),
        ocorrencia: fd.get("ocorrencia"),
        observacao: fd.get("observacao"),
        minutosPrevistos: previstoStr ? paraMinutos(previstoStr) : 0,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar o registro.");
      return;
    }

    onClose();
    router.refresh();
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const dataDefault = registro ? new Date(registro.data).toISOString().slice(0, 10) : hoje;

  return (
    <Modal open={open} onClose={onClose} title={editando ? "Editar ponto manual" : "Lançar ponto manual"}>
      <form key={registro?.id ?? "novo"} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Data" name="data" type="date" defaultValue={dataDefault} disabled={editando} required />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Entrada (manhã)" name="entrada1" type="time" defaultValue={registro?.entrada1 ?? ""} />
          <Input label="Saída (almoço)" name="saida1" type="time" defaultValue={registro?.saida1 ?? ""} />
          <Input label="Retorno (tarde)" name="entrada2" type="time" defaultValue={registro?.entrada2 ?? ""} />
          <Input label="Saída" name="saida2" type="time" defaultValue={registro?.saida2 ?? ""} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select label="Ocorrência" name="ocorrencia" defaultValue={registro?.ocorrencia ?? "NORMAL"}>
            {OCORRENCIAS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Input
            label="Horas previstas (opcional)"
            name="previsto"
            placeholder="4:30"
            defaultValue={registro && registro.minutosPrevistos > 0 ? formatarMinutos(registro.minutosPrevistos) : ""}
          />
        </div>

        <Input label="Observação (opcional)" name="observacao" defaultValue={registro?.observacao ?? ""} />

        {error && <p className="text-sm text-cda-red">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {editando ? "Salvar alterações" : "Salvar registro"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
