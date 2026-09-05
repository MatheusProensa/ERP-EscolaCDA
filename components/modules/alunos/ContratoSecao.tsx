"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Send, Trash2, Link2 } from "lucide-react";
import type { Contrato } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { showToast } from "@/components/ui/Toast";
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
  podeEditar = true,
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
  podeEditar?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [confirmandoAssinatura, setConfirmandoAssinatura] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

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
    try {
      const res = await fetch(`/api/contratos/${contrato.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assinado: !contrato.assinado }),
      });
      if (!res.ok) throw new Error();
      setConfirmandoAssinatura(false);
      router.refresh();
    } catch {
      showToast("Não foi possível atualizar o contrato. Tente de novo.", "error");
    } finally {
      setLoading(false);
    }
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
    setLoading(true);
    try {
      const res = await fetch(`/api/contratos/${contrato.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setConfirmandoExclusao(false);
      router.refresh();
    } catch {
      showToast("Não foi possível excluir o contrato.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title={`Contrato — ${turmaNome}`} action={action} className="p-5">
      {!contrato ? (
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-cda-text2">Nenhum contrato gerado para esta matrícula ainda.</p>
          {podeEditar && <GerarContratoModal {...modalProps} temContrato={false} />}
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

          {/* NOVO: antes todo botão secundário era branco/outline igual — dava pra
              confundir "Baixar PDF" com "Gerar novamente" (que troca o arquivo) só
              olhando. Agora cada grupo tem uma cor: cinza = ação segura/leitura,
              azul = acompanhamento, roxo = compartilhar, âmbar = substitui o
              arquivo atual (mais consequente), vermelho = apaga de vez. */}
          <div className="flex flex-wrap items-center gap-2">
            {contrato.arquivo && (
              <a
                href={contrato.arquivo}
                download={`Contrato - ${alunoNome}.pdf`}
                title="Baixa o PDF atual do contrato, sem mudar nada"
                className="flex h-10 items-center gap-1.5 rounded-lg border border-cda-border bg-white px-4 text-sm font-medium text-cda-text hover:bg-cda-bg"
              >
                <Download className="h-4 w-4" />
                Baixar PDF
              </a>
            )}
            {podeEditar && (
              <>
                {!contrato.assinado ? (
                  <Button onClick={() => setConfirmandoAssinatura(true)} loading={loading} size="sm" className="bg-cda-green hover:bg-cda-green/90">
                    Marcar como assinado
                  </Button>
                ) : (
                  <Button onClick={() => setConfirmandoAssinatura(true)} loading={loading} size="sm" variant="outline">
                    Marcar como pendente
                  </Button>
                )}
                {!contrato.dataEnvio && (
                  <Button
                    onClick={marcarEnviado}
                    loading={loading}
                    size="sm"
                    variant="outline"
                    title="Só marca a data de envio — não muda o status de assinatura"
                    className="border-cda-blue/40 text-cda-blue hover:bg-cda-blue/5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Marcar como enviado
                  </Button>
                )}
                {!contrato.assinado && (
                  <Button
                    onClick={copiarLinkAssinatura}
                    loading={loading}
                    size="sm"
                    variant="outline"
                    title="Copia o link público de assinatura pra mandar pro responsável"
                    className="border-cda-purple/40 text-cda-purple hover:bg-cda-purple/5"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    {linkCopiado ? "Link copiado!" : "Copiar link de assinatura"}
                  </Button>
                )}
                <div className="mx-1 h-6 w-px bg-cda-border" />
                <GerarContratoModal {...modalProps} temContrato />
                <button
                  onClick={() => setConfirmandoExclusao(true)}
                  disabled={loading}
                  title="Excluir contrato — apaga de vez, não dá pra desfazer"
                  aria-label="Excluir contrato"
                  className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-cda-red hover:bg-cda-red/5 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir contrato
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {contrato && (
        <>
          <ConfirmDialog
            open={confirmandoAssinatura}
            onClose={() => setConfirmandoAssinatura(false)}
            onConfirm={alternarAssinado}
            title={contrato.assinado ? "Marcar como pendente de novo?" : "Marcar como assinado?"}
            consequence={
              contrato.assinado
                ? "Ele volta a aparecer como não assinado."
                : "Use só depois que a assinatura (física ou pelo link) realmente aconteceu."
            }
            confirmLabel={contrato.assinado ? "Marcar como pendente" : "Marcar como assinado"}
            confirmVariant="primary"
            loading={loading}
          />
          <ConfirmDialog
            open={confirmandoExclusao}
            onClose={() => setConfirmandoExclusao(false)}
            onConfirm={excluirContrato}
            title="Excluir este contrato?"
            consequence="Essa ação não pode ser desfeita."
            confirmLabel="Excluir"
            loading={loading}
          />
        </>
      )}
    </Card>
  );
}
