"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FileUpload } from "@/components/ui/FileUpload";
import { showToast } from "@/components/ui/Toast";
import type { NovoInteressado } from "@/lib/importarInteressados";

type Preview = {
  headers: string[];
  colunas: Record<string, string | null>;
  totalLinhas: number;
  novos: NovoInteressado[];
  ignorados: number;
};

/** Importação de planilha de Interessados — mesmo padrão visual dos
 * importadores de Alunos/Funcionários, mas sem diff de atualização: aqui
 * toda linha reconhecível vira proposta de CRIAÇÃO (é gente nova entrando
 * no funil), com possíveis duplicatas sinalizadas em vez de bloqueadas —
 * quem importa decide se cria mesmo assim. */
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
      const res = await fetch("/api/interessados/importar", {
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
      // Duplicata provável nasce DESSELECIONADA — cria só o que a pessoa
      // conferir e marcar de propósito, evita duplicar família sem querer.
      setSelecionados(new Set(data.novos.filter((n: NovoInteressado) => !n.possivelDuplicata).map((n: NovoInteressado) => n.id)));
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

  async function aplicar() {
    if (!preview) return;
    const itensSelecionados = preview.novos.filter((n) => selecionados.has(n.id));
    if (itensSelecionados.length === 0) {
      showToast("Selecione ao menos um interessado.", "error");
      return;
    }
    setAplicando(true);
    try {
      const res = await fetch("/api/interessados/importar/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itens: itensSelecionados }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Não foi possível aplicar a importação.", "error");
        return;
      }
      showToast(`${data.criados} interessado(s) criado(s).`);
      setPreview(null);
      router.push("/interessados");
      router.refresh();
    } finally {
      setAplicando(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <p className="mb-3 text-sm text-cda-text2">
          Envie a planilha (.xlsx) com a lista de famílias interessadas — o sistema reconhece colunas como
          &quot;Criança&quot;, &quot;Responsável&quot;, &quot;Telefone&quot;, &quot;E-mail&quot; e &quot;Turma desejada&quot;
          automaticamente. Nada é gravado antes de você conferir e confirmar.
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
            <p className="mt-2 text-xs text-cda-text3">
              {preview.totalLinhas} linha(s) lida(s){preview.ignorados > 0 && ` — ${preview.ignorados} sem criança/responsável/telefone, ignorada(s)`}.
            </p>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cda-border px-5 py-4">
              <h3 className="text-sm font-semibold text-cda-text">{preview.novos.length} interessado(s) na planilha</h3>
              <Button onClick={aplicar} loading={aplicando} disabled={selecionados.size === 0}>
                Criar {selecionados.size} selecionado(s)
              </Button>
            </div>
            {preview.novos.length === 0 ? (
              <p className="p-5 text-sm text-cda-text3">Nenhum interessado reconhecido na planilha.</p>
            ) : (
              <div className="divide-y divide-cda-border">
                {preview.novos.map((item) => (
                  <label key={item.id} className="flex cursor-pointer items-start gap-3 px-5 py-3 hover:bg-cda-bg">
                    <input
                      type="checkbox"
                      checked={selecionados.has(item.id)}
                      onChange={() => alternar(item.id)}
                      className="mt-0.5 h-4 w-4 rounded border-cda-border"
                    />
                    <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-cda-green" />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-cda-text">
                        {item.nomeCrianca}
                        {item.possivelDuplicata && (
                          <Badge variant="warning">
                            <TriangleAlert className="h-3 w-3" /> Já pode estar na lista
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-cda-text3">
                        Responsável: {item.nomeResponsavel} · {item.telefoneResponsavel}
                        {item.turmaDesejadaTexto && ` · Turma "${item.turmaDesejadaTexto}" (não cadastrada)`}
                      </p>
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
