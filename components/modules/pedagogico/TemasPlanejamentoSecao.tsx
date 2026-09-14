"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, NotebookPen } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { NovoTemaForm } from "./NovoTemaForm";

type Tema = { id: string; titulo: string; estrutura: string | null };

/** Lista de temas prontos pra montar o planejamento semanal — qualquer
 * professora vê (é o "cardápio" de temas), só a coordenadora cadastra novo. */
export function TemasPlanejamentoSecao({ temas, souCoordenadora }: { temas: Tema[]; souCoordenadora: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <NotebookPen className="h-4 w-4 text-cda-blue" />
          Temas de planejamento
        </div>
      }
      action={
        souCoordenadora && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Novo tema
          </Button>
        )
      }
    >
      {temas.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="Nenhum tema cadastrado ainda"
          subtitle={
            souCoordenadora
              ? 'Clique em "Novo tema" pra preparar o roteiro da semana pras professoras.'
              : "A coordenação ainda não cadastrou nenhum tema."
          }
        />
      ) : (
        <div className="flex flex-col divide-y divide-cda-border">
          {temas.map((tema) => (
            <div key={tema.id} className="px-5 py-3">
              <p className="text-sm font-medium text-cda-text">{tema.titulo}</p>
              {tema.estrutura && <p className="mt-1 whitespace-pre-line text-xs text-cda-text2">{tema.estrutura}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Novo tema de planejamento">
        <NovoTemaForm
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
