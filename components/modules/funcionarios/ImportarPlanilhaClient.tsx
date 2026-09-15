"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, TriangleAlert, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FileUpload } from "@/components/ui/FileUpload";
import { showToast } from "@/components/ui/Toast";
import type { ItemFuncionario } from "@/lib/importarFuncionarios";

type Preview = {
  headers: string[];
  colunas: Record<string, string | null>;
  totalLinhas: number;
  itens: ItemFuncionario[];
  incompletos: string[];
};

const NOME_CAMPO: Record<string, string> = {
  cargo: "Cargo",
  setor: "Setor",
  telefone: "Telefone",
  email: "E-mail",
  dataNascimento: "Nascimento",
  admissao: "Admissão",
};

/** Importação de planilha de Funcionários — mesmo padrão da de Alunos
 * (ImportarPlanilhaClient em components/modules/alunos), out/2026: casa por
 * CPF, mostra diffs pra quem já existe e propostas de criação pra quem não
 * bate com ninguém, tudo selecionável antes de aplicar. */
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
      const res = await fetch("/api/funcionarios/importar", {
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
      setSelecionados(new Set(data.itens.map((i: ItemFuncionario) => i.id)));
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

  const colunasReconhecidas = useMemo(() => (preview ? Object.entries(preview.colunas).filter(([, v]) => v) : []), [preview]);
  const colunasNaoReconhecidas = useMemo(
    () => (preview ? Object.entries(preview.colunas).filter(([, v]) => !v).map(([k]) => k) : []),
    [preview]
  );
  const atualizacoes = useMemo(() => (preview ? preview.itens.filter((i) => i.tipo === "atualizar") : []), [preview]);
  const criacoes = useMemo(() => (preview ? preview.itens.filter((i) => i.tipo === "criar") : []), [preview]);

  async function aplicar() {
    if (!preview) return;
    const itensSelecionados = preview.itens.filter((i) => selecionados.has(i.id));
    if (itensSelecionados.length === 0) {
      showToast("Selecione ao menos um item.", "error");
      return;
    }
    setAplicando(true);
    try {
      const res = await fetch("/api/funcionarios/importar/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itens: itensSelecionados }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Não foi possível aplicar a importação.", "error");
        return;
      }
      const partes = [];
      if (data.criados > 0) partes.push(`${data.criados} criado(s)`);
      if (data.atualizados > 0) partes.push(`${data.atualizados} atualizado(s)`);
      showToast(partes.length > 0 ? partes.join(", ") + "." : "Nada foi aplicado.");
      if (data.erros?.length > 0) showToast(`${data.erros.length} item(ns) com erro — confira o log.`, "error");
      setPreview(null);
      router.push("/funcionarios");
      router.refresh();
    } finally {
      setAplicando(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <p className="mb-3 text-sm text-cda-text2">
          Envie a planilha (.xlsx) com os funcionários — o sistema reconhece colunas como &quot;Nome&quot;,
          &quot;CPF&quot;, &quot;Cargo&quot;, &quot;Setor&quot;, &quot;Telefone&quot; e &quot;Admissão&quot; automaticamente.
          Quem já está cadastrado (casado pelo CPF) entra como atualização; quem não bate com ninguém entra como
          proposta de novo cadastro. Nada é gravado antes de você conferir e confirmar.
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
                <Badge key={campo} variant="success">
                  {campo}: &quot;{coluna}&quot;
                </Badge>
              ))}
              {colunasNaoReconhecidas.map((campo) => (
                <Badge key={campo} variant="warning">
                  {campo}: não encontrada
                </Badge>
              ))}
            </div>
            <p className="mt-2 text-xs text-cda-text3">{preview.totalLinhas} linha(s) lida(s) na planilha.</p>
          </Card>

          {preview.incompletos.length > 0 && (
            <Card className="border-cda-amber/40 p-5">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-cda-text">
                <TriangleAlert className="h-4 w-4 text-cda-amber" /> Precisam de conferência manual
              </p>
              <ul className="list-inside list-disc text-sm text-cda-text2">
                {preview.incompletos.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cda-border px-5 py-4">
              <h3 className="text-sm font-semibold text-cda-text">{preview.itens.length} item(ns) detectado(s)</h3>
              <Button onClick={aplicar} loading={aplicando} disabled={selecionados.size === 0}>
                Aplicar {selecionados.size} selecionado(s)
              </Button>
            </div>
            {preview.itens.length === 0 ? (
              <p className="p-5 text-sm text-cda-text3">Nenhuma diferença nem funcionário novo — tudo já bate com o cadastro.</p>
            ) : (
              <div className="divide-y divide-cda-border">
                {criacoes.map((item) => {
                  if (item.tipo !== "criar") return null;
                  return (
                    <label key={item.id} className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-cda-bg">
                      <input type="checkbox" checked={selecionados.has(item.id)} onChange={() => alternar(item.id)} className="h-4 w-4 rounded border-cda-border" />
                      <UserPlus className="h-4 w-4 shrink-0 text-cda-green" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-cda-text">{item.nome}</p>
                        <p className="text-xs text-cda-text3">
                          {item.cargo} · {item.setor}
                          {item.cpf && ` · CPF ${item.cpf}`}
                        </p>
                      </div>
                      <Badge variant="success">Novo</Badge>
                    </label>
                  );
                })}
                {atualizacoes.map((item) => {
                  if (item.tipo !== "atualizar") return null;
                  return (
                    <label key={item.id} className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-cda-bg">
                      <input type="checkbox" checked={selecionados.has(item.id)} onChange={() => alternar(item.id)} className="h-4 w-4 rounded border-cda-border" />
                      <FileSpreadsheet className="h-4 w-4 shrink-0 text-cda-text3" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-cda-text">{item.funcionarioNome}</p>
                        <p className="text-xs text-cda-text3">{NOME_CAMPO[item.campo] ?? item.campo}</p>
                      </div>
                      <div className="shrink-0 text-right text-xs">
                        <span className="text-cda-text3 line-through">{item.atual || "vazio"}</span>
                        {" → "}
                        <span className="font-medium text-cda-text">{item.novo}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
