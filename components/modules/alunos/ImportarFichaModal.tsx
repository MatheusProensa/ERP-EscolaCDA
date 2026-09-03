"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { showToast } from "@/components/ui/Toast";

type ResultadoArquivo = {
  arquivo: string;
  status: "criado" | "pulado" | "erro";
  motivo?: string;
  alunoId?: string;
  avisos?: string[];
};

/**
 * Importa Ficha(s) de Matrícula (.docx) direto — cria o(s) aluno(s) já com
 * responsáveis, sem tela de conferência (decisão do dono do produto: mais
 * rápido pra lote de fichas de uma vez). O resultado por arquivo aparece
 * depois de processar, pra saber o que criou/pulou/deu erro.
 */
export function ImportarFichaModal({
  turmas,
  open,
  onClose,
}: {
  turmas: { id: string; nome: string }[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [turmaId, setTurmaId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ criados: number; total: number; resultados: ResultadoArquivo[] } | null>(null);
  const [erro, setErro] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function fechar() {
    onClose();
    setResultado(null);
    setErro("");
    setTurmaId("");
  }

  async function handleArquivos(files: FileList | null) {
    if (!files || files.length === 0 || !turmaId) return;
    setErro("");
    setResultado(null);
    setEnviando(true);

    const arquivos = await Promise.all(
      Array.from(files).map(
        (file) =>
          new Promise<{ nome: string; dataUri: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ nome: file.name, dataUri: reader.result as string });
            reader.onerror = () => reject(new Error(`Não foi possível ler ${file.name}.`));
            reader.readAsDataURL(file);
          })
      )
    ).catch((e: Error) => e.message);

    if (typeof arquivos === "string") {
      setEnviando(false);
      setErro(arquivos);
      return;
    }

    const res = await fetch("/api/alunos/importar-ficha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turmaId, arquivos }),
    });
    setEnviando(false);
    if (inputRef.current) inputRef.current.value = "";

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível importar.");
      return;
    }

    const data = await res.json();
    setResultado(data);
    if (data.criados > 0) {
      showToast(`${data.criados} aluno(s) criado(s).`);
      router.refresh();
    }
  }

  return (
    <Modal open={open} onClose={fechar} title="Importar Ficha(s) de Matrícula">
      <div className="flex flex-col gap-4">
        {!resultado && (
            <>
              <p className="text-sm text-cda-text2">
                Envia o(s) .docx da Ficha de Matrícula já preenchida — cria o(s) aluno(s) com os responsáveis direto,
                sem passar por tela de conferência. Escolha primeiro a turma de todas as fichas deste lote.
              </p>
              <Select label="Turma" value={turmaId} onChange={(e) => setTurmaId(e.target.value)} required>
                <option value="">Selecione a turma</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </Select>
              <label
                className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center ${
                  turmaId ? "cursor-pointer border-cda-border hover:border-cda-blue hover:bg-cda-blue/5" : "cursor-not-allowed border-cda-border opacity-50"
                }`}
              >
                <FileText className="h-8 w-8 text-cda-text3" />
                <span className="text-sm font-medium text-cda-text">
                  {enviando ? "Processando..." : turmaId ? "Clique pra escolher um ou mais arquivos .docx" : "Escolha a turma primeiro"}
                </span>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".docx"
                  multiple
                  disabled={!turmaId || enviando}
                  className="hidden"
                  onChange={(e) => handleArquivos(e.target.files)}
                />
              </label>
              {erro && <p className="text-sm text-cda-red">{erro}</p>}
              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={fechar}>
                  Fechar
                </Button>
              </div>
            </>
          )}

          {resultado && (
            <>
              <p className="text-sm text-cda-text2">
                {resultado.criados} de {resultado.total} arquivo(s) viraram aluno novo.
              </p>
              <div className="flex flex-col divide-y divide-cda-border rounded-lg border border-cda-border">
                {resultado.resultados.map((r, i) => (
                  <div key={i} className="flex flex-col gap-1 px-3 py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      {r.status === "criado" && <CheckCircle2 className="h-4 w-4 shrink-0 text-cda-green" />}
                      {r.status === "pulado" && <MinusCircle className="h-4 w-4 shrink-0 text-cda-amber" />}
                      {r.status === "erro" && <XCircle className="h-4 w-4 shrink-0 text-cda-red" />}
                      <span className="min-w-0 flex-1 truncate font-medium text-cda-text">{r.arquivo}</span>
                      {r.status === "criado" && r.alunoId && (
                        <Link href={`/alunos/${r.alunoId}`} className="shrink-0 text-xs font-medium text-cda-blue hover:underline">
                          Ver aluno
                        </Link>
                      )}
                    </div>
                    {r.motivo && <p className="pl-6 text-xs text-cda-text3">{r.motivo}</p>}
                    {r.avisos?.map((a, ai) => (
                      <p key={ai} className="pl-6 text-xs text-cda-amber">{a}</p>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setResultado(null)}>
                  Importar mais
                </Button>
                <Button type="button" onClick={fechar}>
                  Concluir
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
  );
}
