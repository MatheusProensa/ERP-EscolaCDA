"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Pencil, Search, Trash2 } from "lucide-react";
import type { Documento, DocumentoCategoria } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { Input } from "@/components/ui/Input";
import { CATEGORIAS_DOCUMENTO, labelCategoria } from "./categorias";
import { EditarDocumentoModal } from "./EditarDocumentoModal";

export function DocumentosPainel({ documentos }: { documentos: Documento[] }) {
  const router = useRouter();
  const [categoria, setCategoria] = useState<DocumentoCategoria | "TODOS">("TODOS");
  const [busca, setBusca] = useState("");
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [editando, setEditando] = useState<Documento | null>(null);

  const filtrados = useMemo(() => {
    return documentos.filter((d) => {
      if (categoria !== "TODOS" && d.categoria !== categoria) return false;
      if (busca && !d.titulo.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [documentos, categoria, busca]);

  const porSubcategoria = useMemo(() => {
    const grupos = new Map<string, Documento[]>();
    for (const doc of filtrados) {
      const chave = doc.subcategoria ?? labelCategoria(doc.categoria);
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave)!.push(doc);
    }
    return Array.from(grupos.entries());
  }, [filtrados]);

  async function handleRemover(id: string) {
    setRemovendoId(id);
    await fetch(`/api/documentos/${id}`, { method: "DELETE" });
    setRemovendoId(null);
    router.refresh();
  }

  const opcoes = [
    { value: "TODOS" as const, label: "Todos", count: documentos.length },
    ...CATEGORIAS_DOCUMENTO.map((c) => ({
      value: c.value,
      label: c.label,
      count: documentos.filter((d) => d.categoria === c.value).length,
    })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented options={opcoes} value={categoria} onChange={setCategoria} />
        <div className="w-full sm:w-64">
          <Input
            placeholder="Buscar documento..."
            icon={<Search className="h-4 w-4" />}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {porSubcategoria.length === 0 && (
        <Card className="p-10 text-center text-sm text-cda-text3">Nenhum documento encontrado.</Card>
      )}

      {porSubcategoria.map(([grupo, docs]) => (
        <Card key={grupo} title={grupo}>
          <div className="flex flex-col divide-y divide-cda-border">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cda-blue/10">
                    <FileText className="h-4 w-4 text-cda-blue" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-cda-text">{doc.titulo}</p>
                    <p className="text-xs text-cda-text3">
                      {labelCategoria(doc.categoria)} · {doc.origem}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <a
                    href={doc.arquivoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-cda-text2 hover:bg-cda-bg"
                    title="Abrir arquivo"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => setEditando(doc)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-cda-text2 hover:bg-cda-bg"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleRemover(doc.id)}
                    disabled={removendoId === doc.id}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-cda-red hover:bg-cda-bg disabled:opacity-50"
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <EditarDocumentoModal documento={editando} onClose={() => setEditando(null)} />
    </div>
  );
}
