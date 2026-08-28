"use client";

import { TriangleAlert } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Alert } from "./Alert";

/**
 * Confirmação destrutiva (handoff de design, etapa 4.5). Substitui window.confirm() em:
 *   TurmaCard · ChaveCard · AvisoCard · FuncionarioTable (2×) ·
 *   DocumentosLista · BoletosTable · NotasFiscaisTable
 *
 * `consequence` existe porque os textos atuais de confirm() já carregam a
 * consequência ("apaga também o histórico de ponto… não dá pra desfazer") e ela
 * merece destaque visual, não uma frase corrida numa caixa do navegador.
 *
 * `secondaryAction` cobre o caso do FuncionarioTable, onde o texto atual já
 * sugere "Desativar" como alternativa ao "Excluir".
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  consequence,
  children,
  confirmLabel = "Confirmar",
  confirmVariant = "danger",
  secondaryAction,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  consequence?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  confirmVariant?: "danger" | "primary";
  secondaryAction?: { label: string; onClick: () => void };
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {consequence && (
        <Alert tone="danger" icon={TriangleAlert} title="Isso não dá pra desfazer" className="mb-4">
          {consequence}
        </Alert>
      )}
      {children && <div className="mb-4 text-sm text-text-body">{children}</div>}
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        {secondaryAction && (
          <Button type="button" variant="outline" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
        <Button type="button" variant={confirmVariant} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
