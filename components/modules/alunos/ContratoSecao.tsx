"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Send, Trash2, Link2 } from "lucide-react";
import type { Contrato } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatarDataHora } from "@/lib/utils";
import { turnoDoContrato } from "@/lib/contratoTexto";
import { GerarContratoModal } from "./GerarContratoModal";

export function ContratoSecao({
  matriculaId,
  turmaNome,
  turno,
  contrato,
  anoLetivo,
  alunoNome,
  alunoDataNascimento,
  responsavelNome,
  responsavelCpf,
  valorMensalidade,
  action,
}: {
  matriculaId: string;
  turmaNome: string;
  turno: "MANHA" | "TARDE";
  contrato: Contrato | null;
  anoLetivo: number;
  alunoNome: string;
  /** yyyy-mm-dd */
  alunoDataNascimento: string;
  responsavelNome: string;
  responsavelCpf: string;
  valorMensalidade: number;
  action?: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);

  const modalProps = {
    matriculaId,
    turmaNome,
    alunoNomeInicial: alunoNome,
    alunoNascimentoInicial: alunoDataNascimento,
    responsavelNomeInicial: responsavelNome,
    responsavelCpfInicial: responsavelCpf,
    valorMensalidadeInicial: valorMensalidade,
    turnoInicial: turnoDoContrato(turmaNome, turno),
    anoLetivo,
  };

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

  async function copiarLinkAssinatura() {
    if (!contrato) return;
    setLoading(true);
    const res = await fetch(`/api/contratos/${contrato.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gerarLink: true }),
    });
    setLoading(false);
    if (!res.ok) return;
    const atualizado = await res.json();
    if (!atualizado.tokenAssinatura) return;
    const url = `${window.location.origin}/assinar/${atualizado.tokenAssinatura}`;
    await navigator.clipboard.writeText(url);
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 3000);
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
    <Card title={`Contrato — ${turmaNome}`} action={action} className="p-5">
      {!contrato ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-cda-text2">Nenhum contrato gerado para esta matrícula ainda.</p>
          <GerarContratoModal {...modalProps} temContrato={false} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={contrato.assinado ? "green" : "amber"}>
              {contrato.assinado ? "Assinado" : "Pendente de assinatura"}
            </Badge>
            {contrato.assinado && contrato.nomeAssinante && (
              <span className="text-xs text-cda-text3">
                Por {contrato.nomeAssinante} (pelo link)
                {contrato.assinadoEm && ` em ${formatarDataHora(contrato.assinadoEm)}`}
              </span>
            )}
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
            {!contrato.assinado && (
              <Button onClick={copiarLinkAssinatura} loading={loading} size="sm" variant="outline">
                <Link2 className="h-3.5 w-3.5" />
                {linkCopiado ? "Link copiado!" : "Copiar link de assinatura"}
              </Button>
            )}
            <div className="mx-1 h-6 w-px bg-cda-border" />
            <GerarContratoModal {...modalProps} temContrato />
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
