"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Barcode } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { Button } from "@/components/ui/Button";

function diaVencimentoPadrao(): string {
  const hoje = new Date();
  const proximo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 5);
  return proximo.toISOString().slice(0, 10);
}

export function NovoBoletoModal({ alunos }: { alunos: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [alunoId, setAlunoId] = useState<string | null>(null);
  const [competencia, setCompetencia] = useState(() => new Date().toISOString().slice(0, 7));
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState(diaVencimentoPadrao);

  async function lancar() {
    if (!alunoId || !competencia || !valor || !vencimento) {
      setError("Aluno, competência, valor e vencimento são obrigatórios.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/boletos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alunoId, competencia, valor: Number(valor), vencimento }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível lançar o boleto.");
      return;
    }
    setOpen(false);
    setAlunoId(null);
    setValor("");
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Barcode className="h-4 w-4" />
        Novo boleto
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo boleto">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cda-text2">
            Fica registrado mesmo se o registro de verdade no Banrisul ainda não estiver ligado — dá pra tentar de
            novo depois.
          </p>
          <Combobox
            label="Aluno"
            items={alunos}
            value={alunoId}
            onChange={setAlunoId}
            getId={(a) => a.id}
            getLabel={(a) => a.nome}
            getAvatar={(a) => ({ nome: a.nome })}
            placeholder="Selecione o aluno"
            countNoun="alunos"
          />
          <Input
            label="Competência (mês de referência)"
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
          />
          <Input label="Valor" type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} />
          <Input label="Vencimento" type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={lancar} loading={loading}>
              Lançar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
