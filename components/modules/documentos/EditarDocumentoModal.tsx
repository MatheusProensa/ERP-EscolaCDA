"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FileText, X } from "lucide-react";
import type { DocumentoInstitucional } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { FileUpload } from "@/components/ui/FileUpload";
import { CATEGORIAS_DOCUMENTO } from "@/lib/utils";

export function EditarDocumentoModal({
  documento,
  onClose,
}: {
  documento: DocumentoInstitucional | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Arquivo NOVO escolhido pra substituir o atual (ou o 1º arquivo, se o
  // documento só tinha link até agora) — null enquanto mantém o que já tem.
  const [arquivoNovo, setArquivoNovo] = useState<{ dataUri: string; nome: string } | null>(null);
  const [manterArquivo, setManterArquivo] = useState(true);
  // Reseta os campos de arquivo ao trocar de documento — ajuste durante o
  // render (evita o "cascading renders" de setState dentro de useEffect),
  // mesmo padrão já usado em SemanaPlanejamento/PainelCoordenadoraClient.
  const [documentoAnterior, setDocumentoAnterior] = useState(documento);
  if (documento !== documentoAnterior) {
    setDocumentoAnterior(documento);
    setArquivoNovo(null);
    setManterArquivo(true);
    setError("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!documento) return;
    setError("");

    const fd = new FormData(e.currentTarget);
    const link = String(fd.get("link") ?? "").trim();
    const vaiTerArquivo = arquivoNovo || (documento.arquivo && manterArquivo);
    if (!link && !vaiTerArquivo) {
      setError("Informe um link ou envie um arquivo PDF.");
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/documentos/${documento.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: fd.get("titulo"),
        categoria: fd.get("categoria"),
        link: link || null,
        ...(arquivoNovo ? { arquivo: arquivoNovo.dataUri, nomeArquivo: arquivoNovo.nome } : {}),
        ...(!arquivoNovo && !manterArquivo && documento.arquivo ? { arquivo: null, nomeArquivo: null } : {}),
        validade: fd.get("validade") || null,
        observacao: fd.get("observacao") || null,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar o documento.");
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <Modal open={!!documento} onClose={onClose} title="Editar documento">
      {documento && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Título" name="titulo" required defaultValue={documento.titulo} />
          <Select label="Categoria" name="categoria" required defaultValue={documento.categoria}>
            {CATEGORIAS_DOCUMENTO.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>

          <Input label="Link (Google Drive) — opcional se tiver um PDF enviado" name="link" type="url" defaultValue={documento.link ?? ""} />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-cda-text2">PDF — opcional se preencher o link acima</label>
            {arquivoNovo ? (
              <div className="flex items-center gap-2 rounded-lg border border-cda-border bg-cda-bg px-3 py-2">
                <FileText className="h-4 w-4 shrink-0 text-cda-blue" />
                <span className="min-w-0 flex-1 truncate text-sm text-cda-text">{arquivoNovo.nome}</span>
                <button type="button" onClick={() => setArquivoNovo(null)} className="shrink-0 text-cda-text3 hover:text-cda-red" aria-label="Remover arquivo">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : documento.arquivo && manterArquivo ? (
              <div className="flex items-center gap-2 rounded-lg border border-cda-border bg-cda-bg px-3 py-2">
                <FileText className="h-4 w-4 shrink-0 text-cda-blue" />
                <span className="min-w-0 flex-1 truncate text-sm text-cda-text">{documento.nomeArquivo ?? "Arquivo já enviado"}</span>
                <button type="button" onClick={() => setManterArquivo(false)} className="shrink-0 text-cda-text3 hover:text-cda-red" aria-label="Remover arquivo">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <FileUpload onSelect={(dataUri, nome) => setArquivoNovo({ dataUri, nome })} accept=".pdf" maxSizeMB={20} label="Enviar PDF (até 20MB)" />
            )}
          </div>

          <Input
            label="Validade (opcional)"
            name="validade"
            type="date"
            defaultValue={documento.validade ? new Date(documento.validade).toISOString().slice(0, 10) : ""}
          />
          <Input label="Observação (opcional)" name="observacao" defaultValue={documento.observacao ?? ""} />
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Salvar
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
