"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";

type Modelo = { id: string; titulo: string };
type Ciclo = { id: string; periodo: string; modeloTitulo: string; total: number; enviados: number };

/** Lista os ciclos de parecer já abertos pra uma turma (ex.: "1º Trimestre
 * 2026") e permite abrir um novo — escolhendo o modelo e dando um nome pro
 * período, já que a cadência muda por público (EF é trimestral, Infantil é
 * semestral — achado real, não dá pra travar isso num enum fixo). */
export function CiclosParecerClient({ turmaId, modelos, ciclosIniciais }: { turmaId: string; modelos: Modelo[]; ciclosIniciais: Ciclo[] }) {
  const [ciclos, setCiclos] = useState(ciclosIniciais);
  const [open, setOpen] = useState(false);
  const [modeloId, setModeloId] = useState(modelos[0]?.id ?? "");
  const [periodo, setPeriodo] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function abrirCiclo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    if (!modeloId || !periodo.trim()) {
      setErro("Escolha o modelo e dê um nome pro período.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/pareceres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turmaId, modeloId, periodo: periodo.trim() }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível abrir o ciclo.");
      return;
    }
    const novo = await res.json();
    const modeloTitulo = modelos.find((m) => m.id === modeloId)?.titulo ?? "";
    setCiclos((atual) => [{ id: novo.id, periodo: periodo.trim(), modeloTitulo, total: 0, enviados: 0 }, ...atual]);
    setOpen(false);
    setPeriodo("");
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-cda-blue" />
          Ciclos de parecer
        </div>
      }
      action={
        modelos.length > 0 && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Abrir novo ciclo
          </Button>
        )
      }
    >
      {ciclos.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum ciclo de parecer aberto ainda"
          subtitle={
            modelos.length === 0
              ? "Essa turma ainda não tem modelo de parecer cadastrado — crie um acima antes de abrir um ciclo."
              : 'Clique em "Abrir novo ciclo" pra começar (ex.: "1º Trimestre 2026").'
          }
        />
      ) : (
        <div className="flex flex-col divide-y divide-cda-border">
          {ciclos.map((c) => (
            <Link key={c.id} href={`/pedagogico/parecer/${turmaId}/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-cda-bg">
              <div>
                <p className="text-sm font-medium text-cda-text">{c.periodo}</p>
                <p className="text-xs text-cda-text3">{c.modeloTitulo}</p>
              </div>
              <Badge variant={c.total > 0 && c.enviados === c.total ? "success" : "warning"}>
                {c.enviados}/{c.total} enviados
              </Badge>
            </Link>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Abrir novo ciclo de parecer">
        <form onSubmit={abrirCiclo} className="flex flex-col gap-4">
          <Select label="Modelo" value={modeloId} onChange={(e) => setModeloId(e.target.value)}>
            {modelos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.titulo}
              </option>
            ))}
          </Select>
          <Input label="Período" value={periodo} onChange={(e) => setPeriodo(e.target.value)} placeholder="ex.: 1º Trimestre 2026" autoFocus />
          {erro && <p className="text-sm text-cda-red">{erro}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Abrir ciclo
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
