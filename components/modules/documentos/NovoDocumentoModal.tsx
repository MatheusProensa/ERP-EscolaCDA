"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { FileUpload } from "@/components/ui/FileUpload";
import { CATEGORIAS_DOCUMENTO } from "@/lib/utils";

export function NovoDocumentoModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Arquivo enviado direto — alternativa ao link (pedido do dono, out/2026:
  // "quero poder fazer upload direto de PDF, sem precisar de link externo").
  // Mantém os 2 campos juntos no formulário; o que importa é ter pelo menos um.
  const [arquivo, setArquivo] = useState<{ dataUri: string; nome: string } | null>(null);

  function fechar() {
    setOpen(false);
    setArquivo(null);
    setError("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const fd = new FormData(e.currentTarget);
    const link = String(fd.get("link") ?? "").trim();
    if (!link && !arquivo) {
      setError("Informe um link ou envie um arquivo PDF.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/documentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: fd.get("titulo"),
        categoria: fd.get("categoria"),
        link: link || null,
        arquivo: arquivo?.dataUri ?? null,
        nomeArquivo: arquivo?.nome ?? null,
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

    fechar();
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Novo documento
      </Button>

      <Modal open={open} onClose={fechar} title="Novo documento institucional">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Título" name="titulo" required placeholder="Alvará de Funcionamento" />
          <Select label="Categoria" name="categoria" required defaultValue="">
            <option value="" disabled>
              Selecione a categoria
            </option>
            {CATEGORIAS_DOCUMENTO.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>

          <Input label="Link (Google Drive) — opcional se enviar um PDF abaixo" name="link" type="url" placeholder="https://drive.google.com/..." />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-cda-text2">PDF — opcional se preencher o link acima</label>
            {arquivo ? (
              <div className="flex items-center gap-2 rounded-lg border border-cda-border bg-cda-bg px-3 py-2">
                <FileText className="h-4 w-4 shrink-0 text-cda-blue" />
                <span className="min-w-0 flex-1 truncate text-sm text-cda-text">{arquivo.nome}</span>
                <button type="button" onClick={() => setArquivo(null)} className="shrink-0 text-cda-text3 hover:text-cda-red" aria-label="Remover arquivo">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <FileUpload onSelect={(dataUri, nome) => setArquivo({ dataUri, nome })} accept=".pdf" maxSizeMB={10} label="Enviar PDF (até 10MB)" />
            )}
          </div>

          <Input label="Validade (opcional)" name="validade" type="date" />
          <Input label="Observação (opcional)" name="observacao" placeholder="Ex.: renovar até..." />
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={fechar}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
