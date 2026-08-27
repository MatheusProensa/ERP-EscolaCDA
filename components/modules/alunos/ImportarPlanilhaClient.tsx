"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FileUpload } from "@/components/ui/FileUpload";
import { showToast } from "@/components/ui/Toast";
import { formatarMoeda } from "@/lib/utils";
import type { Diff } from "@/lib/importarAlunos";

type Preview = {
  headers: string[];
  colunas: Record<string, string | null>;
  totalLinhas: number;
  diffs: Diff[];
  naoEncontrados: string[];
  ambiguos: string[];
};

const NOME_CAMPO: Record<string, string> = {
  valorMensalidade: "Mensalidade",
  telefone: "Telefone",
  cpf: "CPF",
  endereco: "Endereço",
  email: "E-mail",
};

function formatarValor(diff: Diff, valor: string | number | null): string {
  if (valor === null || valor === "") return "vazio";
  if (diff.campo === "valorMensalidade") return formatarMoeda(Number(valor));
  return String(valor);
}

export function ImportarPlanilhaClient() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [aplicando, setAplicando] = useState(false);

  async function handleArquivo(dataUri: string) {
    setErro("");
    setPreview(null);
    setCarregando(true);
    try {
      const res = await fetch("/api/alunos/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arquivo: dataUri }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Não foi possível ler a planilha.");
        return;
      }
      setPreview(data);
      setSelecionados(new Set(data.diffs.map((d: Diff) => d.id)));
    } catch {
      setErro("Não foi possível ler a planilha.");
    } finally {
      setCarregando(false);
    }
  }

  function alternar(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  const colunasReconhecidas = useMemo(
    () => preview ? Object.entries(preview.colunas).filter(([, v]) => v) : [],
    [preview]
  );
  const colunasNaoReconhecidas = useMemo(
    () => preview ? Object.entries(preview.colunas).filter(([, v]) => !v).map(([k]) => k) : [],
    [preview]
  );

  async function aplicar() {
    if (!preview) return;
    const diffsSelecionados = preview.diffs.filter((d) => selecionados.has(d.id));
    if (diffsSelecionados.length === 0) {
      showToast("Selecione ao menos uma alteração.", "error");
      return;
    }
    setAplicando(true);
    try {
      const res = await fetch("/api/alunos/importar/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diffs: diffsSelecionados }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Não foi possível aplicar as alterações.", "error");
        return;
      }
      showToast(`${data.aplicados} alteração(ões) aplicada(s).`);
      setPreview(null);
      router.push("/alunos");
      router.refresh();
    } finally {
      setAplicando(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <p className="mb-3 text-sm text-cda-text2">
          Envie a planilha (.xlsx) com os dados atualizados dos alunos — o sistema reconhece colunas como
          &quot;Nome&quot;, &quot;Mensalidade&quot;, &quot;Telefone&quot;, &quot;CPF&quot; e &quot;Endereço&quot; automaticamente.
          Nada é gravado antes de você conferir e confirmar.
        </p>
        <FileUpload
          onSelect={(dataUri) => handleArquivo(dataUri)}
          accept=".xlsx"
          label={carregando ? "Lendo planilha..." : "Selecionar planilha (.xlsx)"}
          disabled={carregando}
        />
        {erro && <p className="mt-2 text-sm text-cda-red">{erro}</p>}
      </Card>

      {preview && (
        <>
          <Card className="p-5">
            <h3 className="mb-2 text-sm font-semibold text-cda-text">Colunas reconhecidas</h3>
            <div className="flex flex-wrap gap-2">
              {colunasReconhecidas.map(([campo, coluna]) => (
                <Badge key={campo} variant="green">
                  {campo}: &quot;{coluna}&quot;
                </Badge>
              ))}
              {colunasNaoReconhecidas.map((campo) => (
                <Badge key={campo} variant="amber">
                  {campo}: não encontrada
                </Badge>
              ))}
            </div>
            <p className="mt-2 text-xs text-cda-text3">{preview.totalLinhas} linha(s) lida(s) na planilha.</p>
          </Card>

          {preview.ambiguos.length > 0 && (
            <Card className="border-cda-amber/40 p-5">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-cda-text">
                <TriangleAlert className="h-4 w-4 text-cda-amber" /> Precisam de conferência manual
              </p>
              <ul className="list-inside list-disc text-sm text-cda-text2">
                {preview.ambiguos.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </Card>
          )}

          {preview.naoEncontrados.length > 0 && (
            <Card className="p-5">
              <p className="mb-2 text-sm font-semibold text-cda-text">
                {preview.naoEncontrados.length} aluno(s) da planilha não encontrados no sistema
              </p>
              <p className="text-sm text-cda-text2">{preview.naoEncontrados.join(", ")}</p>
            </Card>
          )}

          <Card>
            <div className="flex items-center justify-between border-b border-cda-border px-5 py-4">
              <h3 className="text-sm font-semibold text-cda-text">
                {preview.diffs.length} alteração(ões) detectada(s)
              </h3>
              <Button onClick={aplicar} loading={aplicando} disabled={selecionados.size === 0}>
                Aplicar {selecionados.size} selecionada(s)
              </Button>
            </div>
            {preview.diffs.length === 0 ? (
              <p className="p-5 text-sm text-cda-text3">Nenhuma diferença entre a planilha e o que já está cadastrado.</p>
            ) : (
              <div className="divide-y divide-cda-border">
                {preview.diffs.map((diff) => (
                  <label
                    key={diff.id}
                    className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-cda-bg"
                  >
                    <input
                      type="checkbox"
                      checked={selecionados.has(diff.id)}
                      onChange={() => alternar(diff.id)}
                      className="h-4 w-4 rounded border-cda-border"
                    />
                    <FileSpreadsheet className="h-4 w-4 shrink-0 text-cda-text3" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-cda-text">{diff.alunoNome}</p>
                      <p className="text-xs text-cda-text3">{NOME_CAMPO[diff.campo] ?? diff.campo}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs">
                      <span className="text-cda-text3 line-through">{formatarValor(diff, diff.atual)}</span>
                      {" → "}
                      <span className="font-medium text-cda-text">{formatarValor(diff, diff.novo)}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
