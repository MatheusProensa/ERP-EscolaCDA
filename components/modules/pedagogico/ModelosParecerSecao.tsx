"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { NovoModeloParecerForm } from "./NovoModeloParecerForm";

type Paragrafo = { id: string; titulo: string; perguntaNorteadora: string | null };
type Modelo = { id: string; titulo: string; paragrafos: Paragrafo[] };

/** Lista de modelos de parecer (lista de parágrafos guiados) DESSA turma —
 * escopado por turma desde a correção do dono (set/2026: "do parecer tbm,
 * deveria ser em cada turma"), só a regente dela (ou ADMIN) cadastra novo.
 * Cada modelo pode ser expandido pra ver os parágrafos que ele cobre. */
export function ModelosParecerSecao({
  turmaId,
  modelos,
  podeEditar,
}: {
  turmaId: string;
  modelos: Modelo[];
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-cda-blue" />
          Modelo de parecer dessa turma
        </div>
      }
      action={
        podeEditar && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Novo modelo
          </Button>
        )
      }
    >
      {modelos.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum modelo cadastrado ainda"
          subtitle={
            podeEditar
              ? 'Clique em "Novo modelo" pra montar os parágrafos guiados do parecer dessa turma.'
              : "Ainda não tem modelo de parecer cadastrado pra essa turma."
          }
        />
      ) : (
        <div className="flex flex-col divide-y divide-cda-border">
          {modelos.map((modelo) => {
            const aberto = expandido === modelo.id;
            return (
              <div key={modelo.id}>
                <button
                  type="button"
                  onClick={() => setExpandido(aberto ? null : modelo.id)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left"
                >
                  <span className="text-sm font-medium text-cda-text">{modelo.titulo}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-cda-text3">{modelo.paragrafos.length} parágrafo(s)</span>
                    <ChevronDown className={`h-4 w-4 text-cda-text3 transition-transform ${aberto ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {aberto && (
                  <div className="flex flex-col gap-2 px-5 pb-3">
                    {modelo.paragrafos.map((p, i) => (
                      <div key={p.id} className="rounded-lg bg-cda-bg px-3 py-2">
                        <p className="text-xs font-medium text-cda-text">
                          {i + 1}. {p.titulo}
                        </p>
                        {p.perguntaNorteadora && <p className="mt-0.5 text-xs text-cda-text3">{p.perguntaNorteadora}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Novo modelo de parecer">
        <NovoModeloParecerForm
          turmaId={turmaId}
          onCancel={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </Card>
  );
}
