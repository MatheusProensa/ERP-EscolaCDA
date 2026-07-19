"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { MensalidadeLinha } from "./MensalidadeTable";

export function RegistrarPagamentoModal({
  mensalidade,
  onClose,
}: {
  mensalidade: MensalidadeLinha | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!mensalidade) return;
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/financeiro/pagamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mensalidadeId: mensalidade.id,
        valor: fd.get("valor"),
        dataPagamento: fd.get("dataPagamento"),
        formaPagamento: fd.get("formaPagamento"),
        observacao: fd.get("observacao"),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível registrar o pagamento.");
      return;
    }

    onClose();
    router.refresh();
  }

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <Modal open={!!mensalidade} onClose={onClose} title="Registrar pagamento">
      {mensalidade && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-cda-text2">
            {mensalidade.matricula?.aluno.nome && (
              <span className="font-medium text-cda-text">{mensalidade.matricula.aluno.nome} · </span>
            )}
            Referência {mensalidade.mes}/{mensalidade.ano}
          </p>
          <Input
            label="Valor pago"
            name="valor"
            type="number"
            step="0.01"
            defaultValue={mensalidade.valor}
            required
          />
          <Input label="Data do pagamento" name="dataPagamento" type="date" defaultValue={hoje} required />
          <Select label="Forma de pagamento" name="formaPagamento" defaultValue="PIX" required>
            <option value="PIX">PIX</option>
            <option value="DINHEIRO">Dinheiro</option>
            <option value="CARTAO_DEBITO">Cartão de débito</option>
            <option value="CARTAO_CREDITO">Cartão de crédito</option>
            <option value="BOLETO">Boleto</option>
            <option value="TRANSFERENCIA">Transferência</option>
          </Select>
          <Input label="Observação (opcional)" name="observacao" />
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Confirmar pagamento
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
