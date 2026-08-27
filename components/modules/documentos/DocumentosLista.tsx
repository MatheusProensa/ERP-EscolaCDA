"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Trash2, Pencil, FileText, TriangleAlert } from "lucide-react";
import type { DocumentoInstitucional } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatarData } from "@/lib/utils";
import { EditarDocumentoModal } from "./EditarDocumentoModal";

// Chrome bloqueia a visualização de PDF ao navegar direto pra uma URL "data:" em
// nova aba (mostra a página em branco, mesmo o arquivo estando correto) — só
// funciona a partir de uma origem normal, então converte pra Blob antes de abrir.
function abrirDocumento(link: string) {
  if (!link.startsWith("data:")) {
    window.open(link, "_blank", "noopener,noreferrer");
    return;
  }
  const [header, base64] = link.split(",");
  const mime = header.match(/data:(.*);base64/)?.[1] || "application/pdf";
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function statusValidade(validade: Date | null): { label: string; variant: "red" | "amber" | "green" } | null {
  if (!validade) return null;
  const hoje = new Date();
  const dias = Math.floor((new Date(validade).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  if (dias < 0) return { label: "Vencido", variant: "red" };
  if (dias <= 60) return { label: `Vence em ${dias}d`, variant: "amber" };
  return { label: "Válido", variant: "green" };
}

export function DocumentosLista({ grupos }: { grupos: { categoria: string; itens: DocumentoInstitucional[] }[] }) {
  const router = useRouter();
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [editando, setEditando] = useState<DocumentoInstitucional | null>(null);

  async function handleRemover(id: string) {
    if (!confirm("Remover este documento da lista? O arquivo continua no Drive.")) return;
    setRemovendoId(id);
    await fetch(`/api/documentos/${id}`, { method: "DELETE" });
    setRemovendoId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {grupos.map((grupo) => (
        <Card key={grupo.categoria} title={grupo.categoria}>
          <div className="flex flex-col divide-y divide-cda-border">
            {grupo.itens.map((doc) => {
              const status = statusValidade(doc.validade);
              return (
                <div key={doc.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cda-blue/10">
                      <FileText className="h-4 w-4 text-cda-blue" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-cda-text">{doc.titulo}</p>
                      <p className="truncate text-xs text-cda-text3">
                        {doc.validade ? `Validade: ${formatarData(doc.validade)}` : "Sem validade definida"}
                        {doc.observacao ? ` · ${doc.observacao}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {status && (
                      <Badge variant={status.variant}>
                        {status.variant === "red" && <TriangleAlert className="mr-1 -mt-0.5 inline h-3 w-3" />}
                        {status.label}
                      </Badge>
                    )}
                    <a
                      href={doc.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-cda-text2 hover:bg-cda-bg"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => setEditando(doc)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-cda-text2 hover:bg-cda-bg"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRemover(doc.id)}
                      disabled={removendoId === doc.id}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-cda-red hover:bg-cda-bg disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      <EditarDocumentoModal documento={editando} onClose={() => setEditando(null)} />
    </div>
  );
}
