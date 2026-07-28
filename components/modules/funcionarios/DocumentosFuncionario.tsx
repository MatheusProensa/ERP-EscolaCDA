"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2, FileText } from "lucide-react";
import type { DocumentoFuncionario } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { FileUpload } from "@/components/ui/FileUpload";
import { formatarDataHora } from "@/lib/utils";

const TIPOS_DOCUMENTO = [
  "Contrato de Trabalho",
  "RG",
  "CPF",
  "CTPS",
  "Comprovante de Residência",
  "Certificado/Diploma",
  "Atestado Médico",
  "Outro",
];

export function DocumentosFuncionario({
  funcionarioId,
  documentos,
}: {
  funcionarioId: string;
  documentos: DocumentoFuncionario[];
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState(TIPOS_DOCUMENTO[0]);
  const [enviando, setEnviando] = useState(false);
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleUpload(arquivo: string, nomeArquivo: string) {
    setError("");
    setEnviando(true);
    const res = await fetch(`/api/funcionarios/${funcionarioId}/documentos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, nomeArquivo, arquivo }),
    });
    setEnviando(false);

    if (!res.ok) {
      setError("Não foi possível anexar o arquivo.");
      return;
    }
    router.refresh();
  }

  async function handleRemover(docId: string) {
    if (!confirm("Remover este documento?")) return;
    setError("");
    setRemovendoId(docId);
    const res = await fetch(`/api/funcionarios/${funcionarioId}/documentos/${docId}`, { method: "DELETE" });
    setRemovendoId(null);

    if (!res.ok) {
      setError("Não foi possível remover o documento.");
      return;
    }
    router.refresh();
  }

  return (
    <Card title="Documentos">
      <div className="flex flex-col divide-y divide-cda-border">
        {documentos.length === 0 && (
          <p className="px-5 py-6 text-center text-sm text-cda-text3">Nenhum documento anexado.</p>
        )}
        {documentos.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cda-blue/10">
                <FileText className="h-4 w-4 text-cda-blue" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-cda-text">{doc.nomeArquivo}</p>
                <p className="text-xs text-cda-text3">
                  {doc.tipo} · {formatarDataHora(doc.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <a
                href={doc.arquivo}
                download={doc.nomeArquivo}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-cda-text2 hover:bg-cda-bg"
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                onClick={() => handleRemover(doc.id)}
                disabled={removendoId === doc.id}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-cda-red hover:bg-cda-bg disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-cda-border p-5 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Select label="Tipo de documento" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS_DOCUMENTO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <FileUpload onSelect={handleUpload} disabled={enviando} />
      </div>
      {error && <p className="px-5 pb-4 text-sm text-cda-red">{error}</p>}
    </Card>
  );
}
