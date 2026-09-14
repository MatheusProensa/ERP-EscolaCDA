"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Sparkles, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjetoForm, type ProjetoPedagogicoDTO } from "./ProjetoForm";

type Projeto = ProjetoPedagogicoDTO & { ativo: boolean; createdAt: string };

const CAMPOS_EXIBICAO: { chave: keyof ProjetoPedagogicoDTO; label: string }[] = [
  { chave: "interessesObservados", label: "Interesses observados" },
  { chave: "necessidadesObservadas", label: "Necessidades observadas" },
  { chave: "acoesNarrativasPerguntas", label: "Ações, narrativas e perguntas das crianças" },
  { chave: "intencionalidades", label: "Intencionalidades e expectativas" },
  { chave: "justificativa", label: "Justificativa" },
];

/** Projeto pedagógico ativo dessa turma (achado real, set/2026: a unidade
 * real de planejamento da Educação Infantil, dura o tempo que precisar — não
 * é fixo por semana/mês). Só a regente (ou ADMIN) cria/edita. Os projetos
 * anteriores ficam num histórico simples, só de consulta. */
export function ProjetoPedagogicoSecao({
  turmaId,
  projetos,
  podeEditar,
}: {
  turmaId: string;
  projetos: Projeto[];
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [modo, setModo] = useState<"novo" | "editar" | null>(null);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);

  const ativo = projetos.find((p) => p.ativo);
  const historico = projetos.filter((p) => !p.ativo);

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cda-blue" />
          Projeto pedagógico
        </div>
      }
      action={
        podeEditar && (
          <div className="flex gap-2">
            {ativo && (
              <Button size="sm" variant="outline" onClick={() => setModo("editar")}>
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
            )}
            <Button size="sm" onClick={() => setModo("novo")}>
              <Plus className="h-3.5 w-3.5" />
              {ativo ? "Novo projeto" : "Abrir projeto"}
            </Button>
          </div>
        )
      }
    >
      {!ativo ? (
        <EmptyState
          icon={Sparkles}
          title="Nenhum projeto pedagógico aberto ainda"
          subtitle={
            podeEditar
              ? 'Clique em "Abrir projeto" pra registrar os interesses e necessidades observados nas crianças.'
              : "Ainda não tem projeto pedagógico aberto pra essa turma."
          }
        />
      ) : (
        <div className="flex flex-col gap-3 px-5 py-4">
          <p className="text-sm font-semibold text-cda-text">{ativo.nome}</p>
          {CAMPOS_EXIBICAO.map((campo) =>
            ativo[campo.chave] ? (
              <div key={campo.chave}>
                <p className="text-xs font-medium text-cda-text2">{campo.label}</p>
                <p className="mt-0.5 whitespace-pre-line text-xs text-cda-text3">{ativo[campo.chave]}</p>
              </div>
            ) : null
          )}
        </div>
      )}

      {historico.length > 0 && (
        <div className="border-t border-cda-border">
          <button
            type="button"
            onClick={() => setMostrarHistorico((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-5 py-2.5 text-left text-xs font-medium text-cda-text3 hover:text-cda-text2"
          >
            Projetos anteriores ({historico.length})
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${mostrarHistorico ? "rotate-180" : ""}`} />
          </button>
          {mostrarHistorico && (
            <div className="flex flex-col divide-y divide-cda-border">
              {historico.map((p) => (
                <p key={p.id} className="px-5 py-2 text-xs text-cda-text3">
                  {p.nome}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={modo !== null} onClose={() => setModo(null)} title={modo === "editar" ? "Editar projeto pedagógico" : "Novo projeto pedagógico"}>
        <ProjetoForm
          turmaId={turmaId}
          projetoInicial={modo === "editar" ? ativo : undefined}
          onCancel={() => setModo(null)}
          onSuccess={() => {
            setModo(null);
            router.refresh();
          }}
        />
      </Modal>
    </Card>
  );
}
