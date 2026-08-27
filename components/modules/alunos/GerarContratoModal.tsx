"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { montarClausulas, type DadosContratoTexto } from "@/lib/contratoTexto";
import { formatarData } from "@/lib/utils";

type Turno = DadosContratoTexto["turnoLabel"];

export function GerarContratoModal({
  matriculaId,
  turmaNome,
  alunoNomeInicial,
  alunoNascimentoInicial,
  responsavelNomeInicial,
  responsavelCpfInicial,
  valorMensalidadeInicial,
  turnoInicial,
  anoLetivo,
  temContrato,
}: {
  matriculaId: string;
  turmaNome: string;
  alunoNomeInicial: string;
  /** yyyy-mm-dd, pro <input type="date"> */
  alunoNascimentoInicial: string;
  responsavelNomeInicial: string;
  responsavelCpfInicial: string;
  valorMensalidadeInicial: number;
  turnoInicial: Turno;
  anoLetivo: number;
  temContrato: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [alunoNome, setAlunoNome] = useState(alunoNomeInicial);
  const [alunoNascimento, setAlunoNascimento] = useState(alunoNascimentoInicial);
  const [responsavelNome, setResponsavelNome] = useState(responsavelNomeInicial);
  const [responsavelCpf, setResponsavelCpf] = useState(responsavelCpfInicial);
  const [valorMensalidade, setValorMensalidade] = useState(String(valorMensalidadeInicial || ""));
  const [turno, setTurno] = useState<Turno>(turnoInicial);

  // Mesmo texto que vira o PDF (lib/contratoTexto, compartilhado com
  // lib/gerarContratoPdf) — a pré-visualização abaixo é exatamente o que sai
  // impresso, não uma aproximação.
  const clausulas = montarClausulas({ anoLetivo, valorMensalidade: Number(valorMensalidade) || 0, turnoLabel: turno });

  async function gerar() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/contratos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matriculaId,
        alunoNome,
        alunoDataNascimento: alunoNascimento,
        responsavelNome,
        responsavelCpf,
        valorMensalidade: Number(valorMensalidade) || 0,
        turnoLabel: turno,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Não foi possível gerar o contrato.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" variant={temContrato ? "outline" : undefined}>
        <FileText className="h-3.5 w-3.5" />
        {temContrato ? "Gerar novamente" : "Gerar contrato"}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Revisar e gerar contrato" className="max-w-5xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <p className="text-xs text-cda-text3">
              Só estes campos entram no contrato — as 27 cláusulas ao lado são fixas, iguais em todo contrato da escola.
            </p>
            <Input label="Aluno(a)" value={alunoNome} onChange={(e) => setAlunoNome(e.target.value)} />
            <Input label="Data de nascimento" type="date" value={alunoNascimento} onChange={(e) => setAlunoNascimento(e.target.value)} />
            <Input label="Turma" value={turmaNome} disabled />
            <Select label="Turno do contrato" value={turno} onChange={(e) => setTurno(e.target.value as Turno)}>
              <option value="Manhã">Manhã</option>
              <option value="Tarde">Tarde</option>
              <option value="Integral">Integral</option>
              <option value="Contraturno">Contraturno</option>
            </Select>
            <Input label="Responsável (CONTRATANTE)" value={responsavelNome} onChange={(e) => setResponsavelNome(e.target.value)} />
            <Input label="CPF do responsável" value={responsavelCpf} onChange={(e) => setResponsavelCpf(e.target.value)} />
            <Input
              label="Valor da mensalidade"
              type="number"
              step="0.01"
              min="0"
              value={valorMensalidade}
              onChange={(e) => setValorMensalidade(e.target.value)}
            />
            {error && <p className="text-sm text-cda-red">{error}</p>}
            <div className="mt-2 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={gerar} loading={loading}>
                Gerar PDF
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-cda-text2">Pré-visualização — exatamente como sai no PDF</p>
            <div className="h-[600px] overflow-y-auto rounded-lg border border-cda-border bg-white p-4 text-[13px] leading-relaxed text-cda-text">
              <p className="mb-0.5 text-base font-bold text-cda-navy">ESCOLA CDA</p>
              <p className="mb-3 text-[11px] text-cda-text3">CONTRATO DE SERVIÇOS EDUCACIONAIS {anoLetivo}</p>
              <p className="mb-1">
                <span className="font-medium">Aluno(a):</span> {alunoNome || "—"}
              </p>
              <p className="mb-1">
                <span className="font-medium">Data de nascimento:</span>{" "}
                {alunoNascimento ? formatarData(new Date(`${alunoNascimento}T00:00:00`)) : "—"}
              </p>
              <p className="mb-1">
                <span className="font-medium">Turma:</span> {turmaNome}
              </p>
              <p className="mb-1">
                <span className="font-medium">CONTRATANTE:</span> {responsavelNome || "—"}
              </p>
              <p className="mb-3">
                <span className="font-medium">CPF:</span> {responsavelCpf || "não informado"}
              </p>
              {clausulas.map((c, i) => (
                <p key={i} className="mb-2.5 whitespace-pre-wrap">
                  {c}
                </p>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
