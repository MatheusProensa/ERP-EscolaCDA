"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Download, Send, Trash2 } from "lucide-react";
import type { Contrato } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatarDataHora } from "@/lib/utils";

export function ContratoSecao({
  matriculaId,
  turmaNome,
  contrato,
}: {
  matriculaId: string;
  turmaNome: string;
  contrato: Contrato | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function gerarContrato() {
    setLoading(true);
    await fetch("/api/contratos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matriculaId }),
    });
    setLoading(false);
    router.refresh();
  }

  async function alternarAssinado() {
    if (!contrato) return;
    setLoading(true);
    await fetch(`/api/contratos/${contrato.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assinado: !contrato.assinado }),
    });
    setLoading(false);
    router.refresh();
  }

  async function marcarEnviado() {
    if (!contrato) return;
    setLoading(true);
    await fetch(`/api/contratos/${contrato.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marcarEnviado: true }),
    });
    setLoading(false);
    router.refresh();
  }

  async function excluirContrato() {
    if (!contrato) return;
    if (!confirm("Excluir este contrato? Essa ação não pode ser desfeita.")) return;
    setLoading(true);
    const res = await fetch(`/api/contratos/${contrato.id}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      alert("Não foi possível excluir o contrato.");
      return;
    }
    router.refresh();
  }

  return (
    <Card title={`Contrato — ${turmaNome}`} className="p-5">
      {!contrato ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-cda-text2">Nenhum contrato gerado para esta matrícula ainda.</p>
          <Button onClick={gerarContrato} loading={loading} size="sm">
            <FileText className="h-3.5 w-3.5" />
            Gerar contrato
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={contrato.assinado ? "green" : "amber"}>
              {contrato.assinado ? "Assinado" : "Pendente de assinatura"}
            </Badge>
            {contrato.dataEnvio && (
              <span className="text-xs text-cda-text3">
                Enviado em {formatarDataHora(contrato.dataEnvio)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {contrato.arquivo && (
              <a
                href={contrato.arquivo}
                download={`contrato-${turmaNome}.pdf`}
                className="flex h-10 items-center gap-1.5 rounded-lg border border-cda-border bg-white px-4 text-sm font-medium text-cda-text hover:bg-cda-bg"
              >
                <Download className="h-4 w-4" />
                Baixar PDF
              </a>
            )}
            {!contrato.assinado ? (
              <Button onClick={alternarAssinado} loading={loading} size="sm" className="bg-cda-green hover:bg-cda-green/90">
                Marcar como assinado
              </Button>
            ) : (
              <Button onClick={alternarAssinado} loading={loading} size="sm" variant="outline">
                Marcar como pendente
              </Button>
            )}
            {!contrato.dataEnvio && (
              <Button onClick={marcarEnviado} loading={loading} size="sm" variant="outline">
                <Send className="h-3.5 w-3.5" />
                Marcar como enviado
              </Button>
            )}
            <div className="mx-1 h-6 w-px bg-cda-border" />
            <button
              onClick={gerarContrato}
              disabled={loading}
              className="text-sm font-medium text-cda-blue hover:underline"
            >
              Gerar novamente
            </button>
            <button
              onClick={excluirContrato}
              disabled={loading}
              title="Excluir contrato"
              aria-label="Excluir contrato"
              className="text-cda-text3 hover:text-cda-red disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
