"use client";

import { useEffect, useState } from "react";
import { Trash2, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IconButton } from "@/components/ui/IconButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { showToast } from "@/components/ui/Toast";
import { formatarData } from "@/lib/utils";
import { FotoPortfolioUpload } from "./FotoPortfolioUpload";

type Item = { id: string; foto: string; legenda: string | null; createdAt: string };

/** Portfólio de 1 aluno como linha do tempo visual (foto + legenda, mais
 * recente primeiro) — ideia confirmada, out/2026, em vez de lista de
 * arquivos. Anexar é bem intuitivo (arrastar-e-soltar / tocar pra escolher,
 * ver FotoPortfolioUpload), pedido explícito do dono. */
export function PortfolioAlunoClient({ turmaId, alunoId, podeEditar }: { turmaId: string; alunoId: string; podeEditar: boolean }) {
  const [itens, setItens] = useState<Item[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [foto, setFoto] = useState<string | null>(null);
  const [legenda, setLegenda] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      setCarregando(true);
      const res = await fetch(`/api/portfolio?alunoId=${alunoId}`);
      if (cancelado) return;
      if (res.ok) setItens(await res.json());
      setCarregando(false);
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [alunoId]);

  async function adicionar() {
    if (!foto) {
      setErro("Escolha uma foto primeiro.");
      return;
    }
    setErro("");
    setEnviando(true);
    const res = await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alunoId, turmaId, foto, legenda: legenda.trim() || undefined }),
    });
    setEnviando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível adicionar a foto.");
      return;
    }
    const novo = await res.json();
    setItens((atual) => [novo, ...atual]);
    setFoto(null);
    setLegenda("");
    showToast("Foto adicionada ao portfólio.");
  }

  async function remover(id: string) {
    const res = await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("Não foi possível remover a foto.", "error");
      return;
    }
    setItens((atual) => atual.filter((i) => i.id !== id));
  }

  return (
    <div className="flex flex-col gap-5">
      {podeEditar && (
        <Card title="Adicionar foto" className="p-5">
          <div className="flex flex-col gap-3">
            <FotoPortfolioUpload value={foto} onChange={setFoto} />
            <Input placeholder="Legenda (opcional)" value={legenda} onChange={(e) => setLegenda(e.target.value)} />
            {erro && <p className="text-sm text-cda-red">{erro}</p>}
            <Button onClick={adicionar} loading={enviando} disabled={!foto} className="self-end">
              Adicionar ao portfólio
            </Button>
          </div>
        </Card>
      )}

      <Card title={`Linha do tempo (${itens.length})`}>
        {carregando ? (
          <p className="px-5 py-4 text-sm text-cda-text3">Carregando...</p>
        ) : itens.length === 0 ? (
          <EmptyState icon={ImageIcon} title="Nenhuma foto ainda" subtitle="As fotos adicionadas aparecem aqui, mais recentes primeiro." />
        ) : (
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {itens.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-lg border border-cda-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.foto} alt={item.legenda ?? "Foto do portfólio"} className="h-48 w-full object-cover" />
                <div className="flex items-start justify-between gap-2 p-3">
                  <div>
                    {item.legenda && <p className="text-sm text-cda-text">{item.legenda}</p>}
                    <p className="text-xs text-cda-text3">{formatarData(item.createdAt)}</p>
                  </div>
                  {podeEditar && (
                    <IconButton icon={Trash2} label="Remover foto" variant="danger" size="sm" onClick={() => remover(item.id)} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
