"use client";

import type { Turma } from "@prisma/client";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { STATUS_INTERESSADO_BADGE } from "@/lib/statusVisual";

/** Formata Date pro value de um <input type="date"> sem escorregar de fuso
 * horário (toISOString() jogaria pra UTC e podia voltar um dia). */
function paraInputDate(data: Date | string | null | undefined): string {
  if (!data) return "";
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type InteressadoInicial = {
  nomeCrianca?: string;
  dataNascimento?: Date | string | null;
  nomeResponsavel?: string;
  parentescoContato?: string | null;
  telefoneResponsavel?: string;
  emailResponsavel?: string | null;
  turmaDesejadaId?: string | null;
  interesseTexto?: string | null;
  dataPrimeiroContato?: Date | string | null;
  dataVisita?: Date | string | null;
  oQueBusca?: string | null;
  observacoes?: string | null;
  status?: string;
};

/** Campos do formulário de Interessado, compartilhados entre o modal de
 * "novo" e o de "editar" — são os mesmos ~13 campos que a Duda preenchia
 * à mão no quadro do Canva, só que agora com status e busca de verdade. */
export function InteressadoFormFields({ turmas, inicial }: { turmas: Turma[]; inicial?: InteressadoInicial }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Nome da criança" name="nomeCrianca" required defaultValue={inicial?.nomeCrianca} />
        <Input label="Nascimento (opcional)" name="dataNascimento" type="date" defaultValue={paraInputDate(inicial?.dataNascimento)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Nome do responsável" name="nomeResponsavel" required defaultValue={inicial?.nomeResponsavel} />
        <Input
          label="Parentesco de quem ligou (opcional)"
          name="parentescoContato"
          placeholder="Preencher só se não for o responsável — ex: Avó, Tia"
          defaultValue={inicial?.parentescoContato ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Telefone" name="telefoneResponsavel" required defaultValue={inicial?.telefoneResponsavel} />
        <Input label="E-mail (opcional)" name="emailResponsavel" type="email" defaultValue={inicial?.emailResponsavel ?? ""} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select label="Turma desejada (opcional)" name="turmaDesejadaId" defaultValue={inicial?.turmaDesejadaId ?? ""}>
          <option value="">Sem preferência</option>
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </Select>
        <Input
          label="Turma/turno de interesse (opcional)"
          name="interesseTexto"
          placeholder="Ex: Berçário I 2027, tarde"
          defaultValue={inicial?.interesseTexto ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Data do 1º contato" name="dataPrimeiroContato" type="date" defaultValue={paraInputDate(inicial?.dataPrimeiroContato)} />
        <Input label="Data da visita (opcional)" name="dataVisita" type="date" defaultValue={paraInputDate(inicial?.dataVisita)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-cda-text2">O que a família busca (opcional)</label>
        <textarea
          name="oQueBusca"
          rows={3}
          placeholder="O que a família prioriza numa escola — fica registrado pro próximo atendimento"
          defaultValue={inicial?.oQueBusca ?? ""}
          className="w-full rounded-lg border border-cda-border bg-white px-3 py-2 text-sm text-cda-text outline-none transition-colors focus:border-cda-blue"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select label="Status" name="status" defaultValue={inicial?.status ?? "AGUARDANDO"}>
          {Object.entries(STATUS_INTERESSADO_BADGE).map(([valor, { label }]) => (
            <option key={valor} value={valor}>
              {label}
            </option>
          ))}
        </Select>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-cda-text2">Observações (opcional)</label>
          <textarea
            name="observacoes"
            rows={1}
            placeholder="Desfecho, detalhe da ligação..."
            defaultValue={inicial?.observacoes ?? ""}
            className="h-10 w-full resize-none rounded-lg border border-cda-border bg-white px-3 py-2 text-sm text-cda-text outline-none transition-colors focus:border-cda-blue"
          />
        </div>
      </div>
    </>
  );
}
