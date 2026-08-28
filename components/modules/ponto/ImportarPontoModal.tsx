"use client";

import { useRef, useState } from "react";
import { Upload, FileSpreadsheet, TriangleAlert } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { showToast } from "@/components/ui/Toast";

type MesPreview = { mes: number; ano: number; label: string; diasNaPlanilha: number; diasJaExistentes: number };
type RegistroImportado = { data: string; entrada1: string; saida1: string; entrada2: string; saida2: string; entrada3: string; saida3: string };

/**
 * "Anexar planilha de ponto" — mesmo esquema do importador de Alunos:
 * envia o .xlsx que a pessoa já preenche fora do sistema (aba por mês,
 * Data/Entrada/Saída), o sistema reconhece os dias sozinho e mostra o que
 * vai mudar mês a mês antes de aplicar. Sempre a planilha de UM funcionário
 * só — o dono dos dados é quem já está selecionado nesta tela.
 */
export function ImportarPontoModal({ funcionarioId, funcionarioNome }: { funcionarioId: string; funcionarioNome: string }) {
  const [open, setOpen] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [erro, setErro] = useState("");
  const [preview, setPreview] = useState<{ nomeDetectado: string | null; totalDias: number; meses: MesPreview[]; registros: RegistroImportado[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function fechar() {
    setOpen(false);
    setPreview(null);
    setErro("");
  }

  async function handleArquivo(file: File | undefined) {
    if (!file) return;
    setErro("");
    setPreview(null);
    setCarregando(true);

    const arquivo = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
      reader.readAsDataURL(file);
    }).catch((e: Error) => e.message);

    if (typeof arquivo !== "string" || !arquivo.startsWith("data:")) {
      setCarregando(false);
      setErro(typeof arquivo === "string" ? arquivo : "Não foi possível ler o arquivo.");
      return;
    }

    const res = await fetch(`/api/ponto/${funcionarioId}/importar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ arquivo }),
    });
    setCarregando(false);
    if (inputRef.current) inputRef.current.value = "";

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível ler essa planilha.");
      return;
    }
    setPreview(await res.json());
  }

  async function confirmar() {
    if (!preview) return;
    setAplicando(true);
    const res = await fetch(`/api/ponto/${funcionarioId}/importar/confirmar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registros: preview.registros }),
    });
    setAplicando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível aplicar a importação.");
      return;
    }
    showToast(`${preview.totalDias} dia(s) de ponto importado(s).`);
    fechar();
    // Vários meses podem ter mudado, não só o que está aberto agora —
    // recarrega pra tudo (grade, saldo acumulado) vir atualizado.
    window.location.reload();
  }

  return (
    <>
      <Button variant="outline" size="sm" icon={Upload} onClick={() => setOpen(true)}>
        Importar planilha
      </Button>

      <Modal open={open} onClose={fechar} title={`Importar ponto — ${funcionarioNome}`}>
        <div className="flex flex-col gap-4">
          {!preview && (
            <>
              <p className="text-sm text-cda-text2">
                Envie o .xlsx de ponto já preenchido fora do sistema (uma aba por mês, com Data/Entrada/Saída). O
                sistema reconhece os dias sozinho e mostra o que vai mudar antes de aplicar.
              </p>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-cda-border p-8 text-center hover:border-cda-blue hover:bg-cda-blue/5">
                <FileSpreadsheet className="h-8 w-8 text-cda-text3" />
                <span className="text-sm font-medium text-cda-text">
                  {carregando ? "Lendo planilha..." : "Clique para escolher o arquivo .xlsx"}
                </span>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx"
                  disabled={carregando}
                  className="hidden"
                  onChange={(e) => handleArquivo(e.target.files?.[0])}
                />
              </label>
              {erro && <p className="text-sm text-cda-red">{erro}</p>}
              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={fechar}>
                  Cancelar
                </Button>
              </div>
            </>
          )}

          {preview && (
            <>
              {preview.nomeDetectado && (
                <p className="text-xs text-cda-text3">
                  A planilha parece ser de <span className="font-medium text-cda-text2">{preview.nomeDetectado}</span> —
                  confira se bate com <span className="font-medium text-cda-text2">{funcionarioNome}</span> antes de aplicar.
                </p>
              )}

              <div className="flex flex-col divide-y divide-cda-border rounded-lg border border-cda-border">
                {preview.meses.map((m) => (
                  <div key={`${m.ano}-${m.mes}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <span className="font-medium text-cda-text">{m.label}</span>
                    <span className="text-cda-text2">
                      {m.diasNaPlanilha} dia(s) na planilha
                      {m.diasJaExistentes > 0 && ` · substitui ${m.diasJaExistentes} já lançado(s)`}
                    </span>
                  </div>
                ))}
              </div>

              {preview.meses.some((m) => m.diasJaExistentes > 0) && (
                <Alert tone="warning" icon={TriangleAlert} title="Isso substitui o que já estava lançado">
                  Nos meses marcados acima, os dias que já estavam no sistema são substituídos pelos da planilha.
                </Alert>
              )}

              {erro && <p className="text-sm text-cda-red">{erro}</p>}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setPreview(null)}>
                  Escolher outro arquivo
                </Button>
                <Button type="button" onClick={confirmar} loading={aplicando}>
                  Importar {preview.totalDias} dia(s)
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
