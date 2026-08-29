"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
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

// Tailwind precisa das duas classes separadas: "divide-x" só cria a largura da borda entre os
// filhos, quem colore é "divide-{cor}" — reaproveitar "border-{cor}" pra isso não pinta nada
// (a linha interna ficava com a cor default, mais escura, destoando da caixa por fora).
const BORDA = "border-[#8fd8f5]";
const DIVISORIA = "divide-[#8fd8f5]";

/** Uma linha da "grade" da ficha real — mesma ideia da tabela do papel: caixas coladas, borda azul clarinha.
 * No celular empilha (cada campo numa linha só) em vez de espremer 2-3 colunas lado a lado — era o que
 * deixava tudo bagunçado (rótulo quebrando em cima do valor, CPF cortado). Empilhado usa risco horizontal
 * entre os campos; lado a lado (sm: pra cima) volta a usar o risco vertical de sempre. */
function Linha({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`flex flex-col divide-y sm:flex-row sm:divide-x sm:divide-y-0 ${DIVISORIA} ${BORDA} border-x border-b first:border-t`}
    >
      {children}
    </div>
  );
}

/** Uma célula: rótulo em cima (igual etiqueta de formulário), valor embaixo — editável ou não.
 * Rótulo e valor na MESMA linha (como no documento) espremia e sobrepunha texto quando o valor
 * era um grupo de checkbox que quebra em 2 linhas; empilhado nunca sobrepõe, cada caixa cresce
 * sozinha sem invadir a vizinha. */
function Celula({ label, peso = 1, children }: { label: string; peso?: number; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-3 py-2.5" style={{ flex: peso }}>
      <span className="text-[10.5px] font-bold uppercase tracking-wide text-[#0d1f4e]">{label}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

function CampoTexto({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full min-w-0 border-b border-dashed border-cda-border bg-transparent text-[14px] text-cda-text outline-none focus:border-cda-blue"
    />
  );
}

function Fixo({ children }: { children: React.ReactNode }) {
  return <span className="text-[14px] text-cda-text2">{children}</span>;
}

function ToggleSimNao({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <span className="inline-flex items-center gap-3.5 text-[13px]">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={value ? "font-bold text-cda-blue" : "text-cda-text3"}
      >
        {value ? "☑" : "☐"} Sim
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={!value ? "font-bold text-cda-blue" : "text-cda-text3"}
      >
        {!value ? "☑" : "☐"} Não
      </button>
    </span>
  );
}

function ChipEscolha<T extends string>({
  opcoes,
  valor,
  onChange,
}: {
  opcoes: { valor: T; label: string }[];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onChange(o.valor)}
          className={valor === o.valor ? "font-bold text-cda-blue" : "text-cda-text3"}
        >
          {valor === o.valor ? "☑" : "☐"} {o.label}
        </button>
      ))}
    </span>
  );
}

function CampoTextoLivre({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full min-w-0 border-b border-dashed border-cda-border bg-transparent text-[14px] text-cda-text outline-none focus:border-cda-blue"
    />
  );
}

function TituloSecao({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 mt-5 text-[13px] font-bold uppercase tracking-wide text-cda-text3 first:mt-0">{children}</p>;
}

function CamposResponsavel({ r, set }: { r: Responsavel; set: (r: Responsavel) => void }) {
  const upd = (campo: keyof Responsavel) => (v: string) => set({ ...r, [campo]: v });
  return (
    <>
      <Linha>
        <Celula label="Nome" peso={2}>
          <CampoTexto value={r.nome} onChange={upd("nome")} />
        </Celula>
        <Celula label="RG">
          <CampoTexto value={r.rg} onChange={upd("rg")} />
        </Celula>
      </Linha>
      <Linha>
        <Celula label="CPF">
          <CampoTexto value={r.cpf} onChange={upd("cpf")} />
        </Celula>
        <Celula label="E-mail" peso={2}>
          <CampoTexto value={r.email} onChange={upd("email")} />
        </Celula>
      </Linha>
      <Linha>
        <Celula label="Escolaridade">
          <CampoTexto value={r.escolaridade} onChange={upd("escolaridade")} />
        </Celula>
        <Celula label="Profissão">
          <CampoTexto value={r.profissao} onChange={upd("profissao")} />
        </Celula>
      </Linha>
      <Linha>
        <Celula label="Endereço" peso={2}>
          <CampoTexto value={r.endereco} onChange={upd("endereco")} />
        </Celula>
        <Celula label="CEP">
          <CampoTexto value={r.cep} onChange={upd("cep")} />
        </Celula>
      </Linha>
      <Linha>
        <Celula label="Tel. Fixo">
          <CampoTexto value={r.telefoneFixo} onChange={upd("telefoneFixo")} />
        </Celula>
        <Celula label="Celular">
          <CampoTexto value={r.telefoneCelular} onChange={upd("telefoneCelular")} />
        </Celula>
        <Celula label="Tel. Comercial">
          <CampoTexto value={r.telefoneComercial} onChange={upd("telefoneComercial")} />
        </Celula>
      </Linha>
    </>
  );
}

export function FichaMatriculaModal({
  alunoId,
  matriculaId,
  alunoNome,
  alunoDataNascimentoLabel,
  dataIngressoLabel,
  turnoLabel,
  alunoCpfInicial,
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
  alunoNome: string;
  alunoDataNascimentoLabel: string;
  dataIngressoLabel: string;
  turnoLabel: string;
  alunoCpfInicial: string;
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

  const [alunoCpf, setAlunoCpf] = useState(alunoCpfInicial);
  const [turno, setTurno] = useState(turnoLabel);
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
        alunoCpf,
        turnoLabel: turno,
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
    const nomeArquivo = alunoNome
      .normalize("NFD")
      .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    a.download = `ficha_matricula_${nomeArquivo}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
    router.refresh();
  }

  const racaOpcoes = Object.entries(RACA_COR_LABEL).map(([valor, label]) => ({
    valor,
    label: label === "Não declarada" ? "N.D." : label,
  }));

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" variant="outline">
        <ClipboardList className="h-3.5 w-3.5" />
        Ficha de matrícula
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Ficha de matrícula" className="max-w-6xl">
        <p className="mb-3 text-sm text-cda-text3">
          É o próprio documento — edita direto em cima. O que já tá no cadastro aparece fixo; só o que falta vira campo.
        </p>

        <div className="overflow-hidden rounded-xl border border-cda-border shadow-sm">
          {/* Faixa de cima do papel timbrado real (logo + "15 anos") */}
          <div
            className="w-full bg-white bg-no-repeat"
            style={{
              paddingTop: "18.4%",
              backgroundImage: "url(/ficha-matricula-fundo.png)",
              backgroundSize: "100% auto",
              backgroundPosition: "top",
            }}
          />

          <div className="max-h-[72vh] overflow-y-auto bg-white px-6 py-3">
            <p className="mb-3 text-[18px] font-bold text-cda-text">FICHA DE MATRÍCULA</p>

            <Linha>
              <Celula label="Data de ingresso/renovação" peso={1.3}>
                <Fixo>{dataIngressoLabel}</Fixo>
              </Celula>
              <Celula label="Turno" peso={1.3}>
                <ChipEscolha
                  opcoes={[
                    { valor: "Tarde", label: "Tarde" },
                    { valor: "Integral", label: "Integral" },
                    { valor: "Contraturno", label: "Contraturno" },
                  ]}
                  valor={turno}
                  onChange={setTurno}
                />
              </Celula>
            </Linha>
            <Linha>
              <Celula label="Data de Nascimento">
                <Fixo>{alunoDataNascimentoLabel}</Fixo>
              </Celula>
              <Celula label="Sexo" peso={1.3}>
                <ChipEscolha
                  opcoes={[
                    { valor: "M", label: "Masculino" },
                    { valor: "F", label: "Feminino" },
                  ]}
                  valor={sexo}
                  onChange={setSexo}
                />
              </Celula>
            </Linha>
            <Linha>
              <Celula label="Nome completo" peso={2}>
                <Fixo>{alunoNome}</Fixo>
              </Celula>
              <Celula label="CPF">
                <CampoTexto value={alunoCpf} onChange={setAlunoCpf} placeholder="000.000.000-00" />
              </Celula>
            </Linha>
            <Linha>
              <Celula label="Raça/etnia" peso={3}>
                <ChipEscolha opcoes={racaOpcoes} valor={racaCor} onChange={setRacaCor} />
              </Celula>
            </Linha>

            <TituloSecao>Filiação — Pai</TituloSecao>
            <CamposResponsavel r={pai} set={setPai} />

            <TituloSecao>Filiação — Mãe</TituloSecao>
            <CamposResponsavel r={mae} set={setMae} />

            <TituloSecao>Perfil da criança</TituloSecao>
            <Linha>
              <Celula label="Tem irmãos?">
                <ToggleSimNao value={temIrmaos} onChange={setTemIrmaos} />
              </Celula>
              <Celula label="Idades respectivas" peso={1.3}>
                <CampoTexto value={idadesIrmaos} onChange={setIdadesIrmaos} />
              </Celula>
            </Linha>
            <Linha>
              <Celula label="Usa bico?">
                <ToggleSimNao value={usaBico} onChange={setUsaBico} />
              </Celula>
              <Celula label="Usa mamadeira?">
                <ToggleSimNao value={usaMamadeira} onChange={setUsaMamadeira} />
              </Celula>
            </Linha>
            <Linha>
              <Celula label="Obs. (bico/mamadeira)" peso={3}>
                <CampoTextoLivre value={obsBicoMamadeira} onChange={setObsBicoMamadeira} />
              </Celula>
            </Linha>
            <Linha>
              <Celula label="Já frequentou outra escola?" peso={1.6}>
                <ToggleSimNao value={jaFrequentouEscola} onChange={setJaFrequentouEscola} />
              </Celula>
              <Celula label="Duração">
                <CampoTexto value={duracaoEscolaAnterior} onChange={setDuracaoEscolaAnterior} />
              </Celula>
            </Linha>
            <Linha>
              <Celula label="Questões de sono/alimentação" peso={3}>
                <CampoTextoLivre value={rotinaSonoAlimentacao} onChange={setRotinaSonoAlimentacao} />
              </Celula>
            </Linha>
            <Linha>
              <Celula label="Brincadeiras prediletas" peso={3}>
                <CampoTextoLivre value={brincadeirasPrediletas} onChange={setBrincadeirasPrediletas} />
              </Celula>
            </Linha>
            <Linha>
              <Celula label="Reações quando contrariado(a)" peso={3}>
                <CampoTextoLivre value={reacoesContrariado} onChange={setReacoesContrariado} />
              </Celula>
            </Linha>
            <p className="mt-1.5 text-[12px] text-cda-text3">
              Saúde, alergias e medicação vêm do cadastro (aba Censo) — entram na ficha automaticamente.
            </p>

            <TituloSecao>Pessoas autorizadas a buscar o aluno</TituloSecao>
            <Linha>
              <Celula label="Mãe">
                <Fixo>{mae.nome.trim() ? "☑ autorizada" : "☐"}</Fixo>
              </Celula>
              <Celula label="Pai">
                <Fixo>{pai.nome.trim() ? "☑ autorizado" : "☐"}</Fixo>
              </Celula>
            </Linha>
            {pessoasAutorizadas.map((p, i) => (
              <Linha key={i}>
                <Celula label={`${i + 1}) Nome`} peso={1.6}>
                  <CampoTexto value={p.nome} onChange={(v) => setPessoa(i, "nome", v)} />
                </Celula>
                <Celula label="Parentesco">
                  <CampoTexto value={p.parentesco} onChange={(v) => setPessoa(i, "parentesco", v)} />
                </Celula>
                <button
                  type="button"
                  onClick={() => setPessoasAutorizadas((atual) => atual.filter((_, idx) => idx !== i))}
                  className="px-2 text-cda-text3 hover:text-cda-red"
                  aria-label="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Linha>
            ))}
            <button
              type="button"
              onClick={() => setPessoasAutorizadas((atual) => [...atual, { nome: "", parentesco: "" }])}
              className="mt-2 flex w-fit items-center gap-1.5 text-[13px] font-medium text-cda-blue hover:underline"
            >
              <Plus className="h-4 w-4" />
              Adicionar pessoa
            </button>

            <div className="mt-4 border-t border-cda-border pt-3">
              <p className="text-[12.5px] leading-relaxed text-cda-text2">
                Eu autorizo a utilizar a imagem do aluno (em fotos e vídeos) em materiais de divulgação institucional
                e pedagógica da escola, exclusivamente para fins de promoção de suas atividades, podendo vinculá-las
                em suas redes sociais, website oficial, material impresso e outdoor.
              </p>
              <div className="mt-1.5">
                <ToggleSimNao value={autorizacaoImagem} onChange={setAutorizacaoImagem} />
              </div>
            </div>
            <div className="h-3" />
          </div>

          {/* Rodapé do papel timbrado real (endereço/telefone/@) */}
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

        {error && <p className="mt-3 text-sm text-cda-red">{error}</p>}
        <div className="mt-4 flex justify-end gap-3">
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
