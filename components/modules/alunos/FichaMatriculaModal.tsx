"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { RACA_COR_LABEL } from "@/lib/censo";

type Responsavel = {
  nome: string;
  rg: string;
  cpf: string;
  email: string;
  escolaridade: string;
  profissao: string;
  endereco: string;
  cep: string;
  telefoneFixo: string;
  telefoneComercial: string;
  telefoneCelular: string;
};

const RESPONSAVEL_VAZIO: Responsavel = {
  nome: "",
  rg: "",
  cpf: "",
  email: "",
  escolaridade: "",
  profissao: "",
  endereco: "",
  cep: "",
  telefoneFixo: "",
  telefoneComercial: "",
  telefoneCelular: "",
};

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-cda-text">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-cda-border"
      />
      {label}
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-cda-text2">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full rounded-lg border border-cda-border bg-white px-3 py-2 text-sm text-cda-text outline-none transition-colors focus:border-cda-blue"
      />
    </div>
  );
}

function SecaoForm({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 border-t border-cda-border pt-3 first:border-t-0 first:pt-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-cda-text3">{titulo}</p>
      {children}
    </div>
  );
}

function CamposResponsavel({ r, set }: { r: Responsavel; set: (r: Responsavel) => void }) {
  const upd = (campo: keyof Responsavel) => (v: string) => set({ ...r, [campo]: v });
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <div className="col-span-2">
        <Input label="Nome" value={r.nome} onChange={(e) => upd("nome")(e.target.value)} />
      </div>
      <Input label="RG" value={r.rg} onChange={(e) => upd("rg")(e.target.value)} />
      <Input label="CPF" value={r.cpf} onChange={(e) => upd("cpf")(e.target.value)} />
      <Input label="E-mail" value={r.email} onChange={(e) => upd("email")(e.target.value)} />
      <Input label="Escolaridade" value={r.escolaridade} onChange={(e) => upd("escolaridade")(e.target.value)} />
      <Input label="Profissão" value={r.profissao} onChange={(e) => upd("profissao")(e.target.value)} />
      <div className="col-span-2">
        <Input label="Endereço" value={r.endereco} onChange={(e) => upd("endereco")(e.target.value)} />
      </div>
      <Input label="CEP" value={r.cep} onChange={(e) => upd("cep")(e.target.value)} />
      <Input label="Celular" value={r.telefoneCelular} onChange={(e) => upd("telefoneCelular")(e.target.value)} />
      <Input label="Tel. fixo" value={r.telefoneFixo} onChange={(e) => upd("telefoneFixo")(e.target.value)} />
      <Input label="Tel. comercial" value={r.telefoneComercial} onChange={(e) => upd("telefoneComercial")(e.target.value)} />
    </div>
  );
}

export function FichaMatriculaModal({
  alunoId,
  matriculaId,
  sexoInicial,
  racaCorInicial,
  autorizacaoImagemInicial,
  temIrmaosInicial,
  idadesIrmaosInicial,
  usaBicoInicial,
  usaMamadeiraInicial,
  obsBicoMamadeiraInicial,
  jaFrequentouEscolaInicial,
  duracaoEscolaAnteriorInicial,
  rotinaSonoAlimentacaoInicial,
  brincadeirasPrediletasInicial,
  reacoesContrariadoInicial,
  paiInicial,
  maeInicial,
  pessoasAutorizadasInicial,
}: {
  alunoId: string;
  matriculaId: string;
  sexoInicial: "M" | "F" | "";
  racaCorInicial: string;
  autorizacaoImagemInicial: boolean;
  temIrmaosInicial: boolean;
  idadesIrmaosInicial: string;
  usaBicoInicial: boolean;
  usaMamadeiraInicial: boolean;
  obsBicoMamadeiraInicial: string;
  jaFrequentouEscolaInicial: boolean;
  duracaoEscolaAnteriorInicial: string;
  rotinaSonoAlimentacaoInicial: string;
  brincadeirasPrediletasInicial: string;
  reacoesContrariadoInicial: string;
  paiInicial: Responsavel | null;
  maeInicial: Responsavel | null;
  pessoasAutorizadasInicial: { nome: string; parentesco: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [sexo, setSexo] = useState(sexoInicial);
  const [racaCor, setRacaCor] = useState(racaCorInicial);
  const [autorizacaoImagem, setAutorizacaoImagem] = useState(autorizacaoImagemInicial);
  const [temIrmaos, setTemIrmaos] = useState(temIrmaosInicial);
  const [idadesIrmaos, setIdadesIrmaos] = useState(idadesIrmaosInicial);
  const [usaBico, setUsaBico] = useState(usaBicoInicial);
  const [usaMamadeira, setUsaMamadeira] = useState(usaMamadeiraInicial);
  const [obsBicoMamadeira, setObsBicoMamadeira] = useState(obsBicoMamadeiraInicial);
  const [jaFrequentouEscola, setJaFrequentouEscola] = useState(jaFrequentouEscolaInicial);
  const [duracaoEscolaAnterior, setDuracaoEscolaAnterior] = useState(duracaoEscolaAnteriorInicial);
  const [rotinaSonoAlimentacao, setRotinaSonoAlimentacao] = useState(rotinaSonoAlimentacaoInicial);
  const [brincadeirasPrediletas, setBrincadeirasPrediletas] = useState(brincadeirasPrediletasInicial);
  const [reacoesContrariado, setReacoesContrariado] = useState(reacoesContrariadoInicial);
  const [pai, setPai] = useState<Responsavel>(paiInicial ?? RESPONSAVEL_VAZIO);
  const [mae, setMae] = useState<Responsavel>(maeInicial ?? RESPONSAVEL_VAZIO);
  const [pessoasAutorizadas, setPessoasAutorizadas] = useState(
    pessoasAutorizadasInicial.length > 0 ? pessoasAutorizadasInicial : [{ nome: "", parentesco: "" }]
  );

  function setPessoa(i: number, campo: "nome" | "parentesco", valor: string) {
    setPessoasAutorizadas((atual) => atual.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));
  }

  async function gerar() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/alunos/${alunoId}/ficha-matricula`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matriculaId,
        sexo: sexo || null,
        racaCor: racaCor || null,
        autorizacaoImagem,
        temIrmaos,
        idadesIrmaos,
        usaBico,
        usaMamadeira,
        obsBicoMamadeira,
        jaFrequentouEscola,
        duracaoEscolaAnterior,
        rotinaSonoAlimentacao,
        brincadeirasPrediletas,
        reacoesContrariado,
        pai: pai.nome.trim() ? pai : null,
        mae: mae.nome.trim() ? mae : null,
        pessoasAutorizadas,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Não foi possível salvar/gerar a ficha.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ficha_matricula.pdf";
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" variant="outline">
        <ClipboardList className="h-3.5 w-3.5" />
        Ficha de matrícula
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Ficha de matrícula" className="max-w-4xl">
        <p className="mb-4 text-xs text-cda-text3">
          Preencha o que faltar — os dados básicos do aluno já vêm do cadastro. Ao gerar, tudo aqui é salvo no
          cadastro do aluno e o PDF é baixado na hora.
        </p>

        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1">
          <SecaoForm titulo="Dados do aluno">
            <div className="grid grid-cols-3 gap-2.5">
              <Select label="Sexo" value={sexo} onChange={(e) => setSexo(e.target.value as "M" | "F" | "")}>
                <option value="">Não informado</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </Select>
              <div className="col-span-2">
                <Select label="Raça/etnia" value={racaCor} onChange={(e) => setRacaCor(e.target.value)}>
                  <option value="">Não informado</option>
                  {Object.entries(RACA_COR_LABEL).map(([valor, label]) => (
                    <option key={valor} value={valor}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <Checkbox label="Autoriza uso de imagem" checked={autorizacaoImagem} onChange={setAutorizacaoImagem} />
          </SecaoForm>

          <SecaoForm titulo="Filiação — Pai">
            <CamposResponsavel r={pai} set={setPai} />
          </SecaoForm>

          <SecaoForm titulo="Filiação — Mãe">
            <CamposResponsavel r={mae} set={setMae} />
          </SecaoForm>

          <SecaoForm titulo="Perfil da criança">
            <div className="flex flex-wrap gap-4">
              <Checkbox label="Tem irmãos?" checked={temIrmaos} onChange={setTemIrmaos} />
              <Checkbox label="Usa bico?" checked={usaBico} onChange={setUsaBico} />
              <Checkbox label="Usa mamadeira?" checked={usaMamadeira} onChange={setUsaMamadeira} />
              <Checkbox label="Já frequentou outra escola?" checked={jaFrequentouEscola} onChange={setJaFrequentouEscola} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {temIrmaos && (
                <Input label="Idades dos irmãos" value={idadesIrmaos} onChange={(e) => setIdadesIrmaos(e.target.value)} />
              )}
              {jaFrequentouEscola && (
                <Input
                  label="Duração na escola anterior"
                  value={duracaoEscolaAnterior}
                  onChange={(e) => setDuracaoEscolaAnterior(e.target.value)}
                />
              )}
            </div>
            <Textarea label="Observações (bico/mamadeira)" value={obsBicoMamadeira} onChange={setObsBicoMamadeira} />
            <Textarea label="Rotina de sono e alimentação" value={rotinaSonoAlimentacao} onChange={setRotinaSonoAlimentacao} />
            <Textarea label="Brincadeiras prediletas" value={brincadeirasPrediletas} onChange={setBrincadeirasPrediletas} />
            <Textarea label="Reações quando contrariado(a)" value={reacoesContrariado} onChange={setReacoesContrariado} />
            <p className="text-xs text-cda-text3">
              Saúde, alergias, medicação e restrições ficam na aba de Censo/cadastro do aluno — entram na ficha automaticamente.
            </p>
          </SecaoForm>

          <SecaoForm titulo="Outras pessoas autorizadas a buscar (além do pai/mãe)">
            <div className="flex flex-col gap-2">
              {pessoasAutorizadas.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Nome"
                    value={p.nome}
                    onChange={(e) => setPessoa(i, "nome", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Parentesco"
                    value={p.parentesco}
                    onChange={(e) => setPessoa(i, "parentesco", e.target.value)}
                    className="w-40"
                  />
                  <button
                    type="button"
                    onClick={() => setPessoasAutorizadas((atual) => atual.filter((_, idx) => idx !== i))}
                    className="text-cda-text3 hover:text-cda-red"
                    aria-label="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setPessoasAutorizadas((atual) => [...atual, { nome: "", parentesco: "" }])}
                className="flex w-fit items-center gap-1.5 text-xs font-medium text-cda-blue hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar pessoa
              </button>
            </div>
          </SecaoForm>
        </div>

        {error && <p className="mt-3 text-sm text-cda-red">{error}</p>}
        <div className="mt-4 flex justify-end gap-3 border-t border-cda-border pt-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={gerar} loading={loading}>
            Salvar e gerar PDF
          </Button>
        </div>
      </Modal>
    </>
  );
}
