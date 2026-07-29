"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import type { Cardapio } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

const DIAS_SEMANA = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

export function CardapioDiaCard({ data, cardapio }: { data: Date; cardapio: Cardapio | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const dataISO = data.toISOString().slice(0, 10);
  const label = `${DIAS_SEMANA[data.getUTCDay()]}, ${data.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`;

  const temConteudo =
    cardapio && (cardapio.fruta || cardapio.almoco || cardapio.lancheInfantil || cardapio.lancheFundamental);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/cardapio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: dataISO,
        fruta: fd.get("fruta"),
        almoco: fd.get("almoco"),
        lancheInfantil: fd.get("lancheInfantil"),
        lancheFundamental: fd.get("lancheFundamental"),
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const resposta = await res.json().catch(() => ({}));
      setError(resposta.error ?? "Não foi possível salvar o cardápio.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  async function remover() {
    if (!cardapio) return;
    if (!confirm("Remover o cardápio deste dia?")) return;
    setError("");
    setLoading(true);
    const res = await fetch(`/api/cardapio/${cardapio.id}`, { method: "DELETE" });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível remover o cardápio.");
      return;
    }

    router.refresh();
  }

  return (
    <Card className="flex flex-col p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-cda-text3">{label}</p>

      {temConteudo ? (
        <div className="mt-2 flex-1 space-y-2">
          {(cardapio!.fruta || cardapio!.almoco) && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-cda-text3">Manhã · Contraturno</p>
              {cardapio!.fruta && (
                <p className="text-sm text-cda-text">
                  <span className="font-medium">Fruta: </span>
                  {cardapio!.fruta}
                </p>
              )}
              {cardapio!.almoco && (
                <p className="text-sm text-cda-text">
                  <span className="font-medium">Almoço: </span>
                  {cardapio!.almoco}
                </p>
              )}
            </div>
          )}
          {(cardapio!.lancheInfantil || cardapio!.lancheFundamental) && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-cda-text3">Tarde · Ensino regular</p>
              {cardapio!.lancheInfantil && (
                <p className="text-sm text-cda-text">
                  <span className="font-medium">Lanche (Ed. Infantil): </span>
                  {cardapio!.lancheInfantil}
                </p>
              )}
              {cardapio!.lancheFundamental && (
                <p className="text-sm text-cda-text">
                  <span className="font-medium">Lanche (Fundamental): </span>
                  {cardapio!.lancheFundamental}
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-2 flex-1 text-sm text-cda-text3">Sem cardápio cadastrado.</p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-cda-border px-3 py-1.5 text-xs font-medium text-cda-text hover:bg-cda-bg"
        >
          <Pencil className="h-3.5 w-3.5" />
          {temConteudo ? "Editar" : "Adicionar"}
        </button>
        {cardapio && (
          <button
            onClick={remover}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-cda-border px-3 py-1.5 text-xs font-medium text-cda-red hover:bg-cda-bg disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {error && !open && <p className="mt-2 text-xs text-cda-red">{error}</p>}

      <Modal open={open} onClose={() => setOpen(false)} title={label}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cda-text3">Manhã · Contraturno</p>
            <div className="flex flex-col gap-3">
              <Input label="Fruta" name="fruta" defaultValue={cardapio?.fruta ?? ""} />
              <Input label="Almoço" name="almoco" defaultValue={cardapio?.almoco ?? ""} />
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cda-text3">Tarde · Ensino regular</p>
            <div className="flex flex-col gap-3">
              <Input
                label="Lanche — Educação Infantil"
                name="lancheInfantil"
                defaultValue={cardapio?.lancheInfantil ?? ""}
              />
              <Input
                label="Lanche — Ensino Fundamental"
                name="lancheFundamental"
                defaultValue={cardapio?.lancheFundamental ?? ""}
              />
            </div>
          </div>
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
