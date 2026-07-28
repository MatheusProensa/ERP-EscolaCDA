"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Download, Send } from "lucide-react";
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

          <div className="flex flex-wrap gap-2">
            {contrato.arquivo && (
              <a
                href={contrato.arquivo}
                download={`contrato-${turmaNome}.pdf`}
                className="flex items-center gap-1.5 rounded-lg border border-cda-border bg-white px-3 py-1.5 text-xs font-medium text-cda-text hover:bg-cda-bg"
              >
                <Download className="h-3.5 w-3.5" />
                Baixar PDF
              </a>
            )}
            <button
              onClick={alternarAssinado}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-cda-border bg-white px-3 py-1.5 text-xs font-medium text-cda-text hover:bg-cda-bg disabled:opacity-50"
            >
              {contrato.assinado ? "Marcar como pendente" : "Marcar como assinado"}
            </button>
            {!contrato.dataEnvio && (
              <button
                onClick={marcarEnviado}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg border border-cda-border bg-white px-3 py-1.5 text-xs font-medium text-cda-text hover:bg-cda-bg disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Marcar como enviado
              </button>
            )}
            <button
              onClick={gerarContrato}
              disabled={loading}
              className="text-xs font-medium text-cda-blue hover:underline"
            >
              Gerar novamente
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
