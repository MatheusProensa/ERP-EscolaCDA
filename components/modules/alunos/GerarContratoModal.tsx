"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { montarClausulas, type DadosContratoTexto } from "@/lib/contratoTexto";
import { formatarData, formatarMoeda } from "@/lib/utils";

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
  // Editável pra dar pra gerar contrato de renovação já pro próximo ano letivo
  // (ex.: portas abertas em setembro) sem precisar trocar o ano letivo ativo
  // do sistema inteiro antes.
  const [anoContrato, setAnoContrato] = useState(anoLetivo);
  // No modelo em papel são linhas em branco ("dia ____ ... mês de ____") — aqui viram campo,
  // com um valor já sugerido pra não obrigar preencher toda vez.
  const [diaVencimento, setDiaVencimento] = useState("05");
  const [mesInicioVencimento, setMesInicioVencimento] = useState("");

  // Mesmo texto que vira o PDF (lib/contratoTexto, compartilhado com
  // lib/gerarContratoPdf) — a pré-visualização abaixo é exatamente o que sai
  // impresso, não uma aproximação.
  const clausulas = montarClausulas({
    anoLetivo: anoContrato,
    valorMensalidade: Number(valorMensalidade) || 0,
    turnoLabel: turno,
    diaVencimento,
    mesInicioVencimento,
  });

  async function gerar() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/contratos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matriculaId,
        anoLetivo: anoContrato,
        alunoNome,
        alunoDataNascimento: alunoNascimento,
        responsavelNome,
        responsavelCpf,
        valorMensalidade: Number(valorMensalidade) || 0,
        turnoLabel: turno,
        diaVencimento,
        mesInicioVencimento,
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
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        variant={temContrato ? "outline" : undefined}
        title={temContrato ? "Gera um novo PDF e substitui o arquivo atual do contrato" : undefined}
        className={temContrato ? "border-cda-amber/40 text-cda-amber hover:bg-cda-amber/5" : undefined}
      >
        <FileText className="h-3.5 w-3.5" />
        {temContrato ? "Gerar novamente" : "Gerar contrato"}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Revisar e gerar contrato" className="max-w-6xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <p className="text-xs text-cda-text3">
              Só estes campos entram no contrato — as 27 cláusulas ao lado são fixas, iguais em todo contrato da escola.
            </p>
            <Input
              label="Ano letivo do contrato"
              type="number"
              value={anoContrato}
              onChange={(e) => setAnoContrato(Number(e.target.value) || anoLetivo)}
            />
            <Input label="Aluno(a)" value={alunoNome} onChange={(e) => setAlunoNome(e.target.value)} />
            <Input label="Data de nascimento" type="date" value={alunoNascimento} onChange={(e) => setAlunoNascimento(e.target.value)} />
            <Input label="Turma" value={turmaNome} disabled />
            <Select label="Turno do contrato" value={turno} onChange={(e) => setTurno(e.target.value as Turno)}>
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Dia do vencimento"
                type="number"
                min="1"
                max="28"
                value={diaVencimento}
                onChange={(e) => setDiaVencimento(e.target.value)}
              />
              <Input
                label="Mês de início da cobrança"
                placeholder="ex.: setembro"
                value={mesInicioVencimento}
                onChange={(e) => setMesInicioVencimento(e.target.value)}
              />
            </div>
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
            <div className="overflow-hidden rounded-xl border border-cda-border shadow-sm">
              {/* Mesmo papel timbrado real usado na Ficha de Matrícula — é o mesmo documento oficial. */}
              <div
                className="w-full bg-white bg-no-repeat"
                style={{
                  paddingTop: "18.4%",
                  backgroundImage: "url(/ficha-matricula-fundo.png)",
                  backgroundSize: "100% auto",
                  backgroundPosition: "top",
                }}
              />
              <div className="h-[520px] overflow-y-auto bg-white p-4 text-[13px] leading-relaxed text-cda-text">
                <p className="mb-3 text-[15px] font-bold text-cda-text">CONTRATO DE SERVIÇOS EDUCACIONAIS {anoContrato}</p>
                <p className="mb-1">
                  <span className="font-medium">Aluno(a):</span> {alunoNome || "—"}
                </p>
                <p className="mb-1">
                  <span className="font-medium">Data de nascimento:</span>{" "}
                  {alunoNascimento ? formatarData(new Date(`${alunoNascimento}T00:00:00`)) : "—"}
                </p>
                <p className="mb-1">
                  <span className="font-medium">Turma:</span> {turmaNome} ({turno})
                </p>
                <p className="mb-1">
                  <span className="font-medium">CONTRATANTE:</span> {responsavelNome || "—"}
                </p>
                <p className="mb-1">
                  <span className="font-medium">CPF:</span> {responsavelCpf || "não informado"}
                </p>
                <p className="mb-3">
                  <span className="font-medium">Valor da mensalidade:</span>{" "}
                  {Number(valorMensalidade) > 0 ? formatarMoeda(Number(valorMensalidade)) : "—"}
                </p>
                {clausulas.map((c, i) => (
                  <p key={i} className="mb-2.5 whitespace-pre-wrap">
                    {c}
                  </p>
                ))}
              </div>
              <div
                className="w-full bg-white bg-no-repeat"
                style={{
                  paddingTop: "3.2%",
                  backgroundImage: "url(/ficha-matricula-fundo.png)",
                  backgroundSize: "100% auto",
                  backgroundPosition: "bottom",
                }}
              />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
