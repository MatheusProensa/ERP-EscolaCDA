"use client";

import { useState } from "react";
import { Users, CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, BADGE_VARIANT_STYLE } from "@/components/ui/Badge";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Table, TableHead, Th, TableBody, Tr, Td } from "@/components/ui/Table";
import { showToast } from "@/components/ui/Toast";
import { STATUS_FESTA_FAMILIA_BADGE } from "@/lib/statusVisual";
import type { TurmaConfirmacoes } from "@/lib/festaFamilia";

const STATUS_OPTIONS = Object.entries(STATUS_FESTA_FAMILIA_BADGE).map(([value, { label }]) => ({ value, label }));
const CONFIRMADOS = new Set(["CONFIRMADO_AGENDA", "CONFIRMADO_FORMS"]);

type Patch = { status?: string; adultos?: number | null; criancas?: number | null; horario?: string | null; compareceu?: boolean | null };

function resumoDe(turmas: TurmaConfirmacoes[]) {
  let total = 0;
  let confirmados = 0;
  let semResposta = 0;
  let naoIrao = 0;
  for (const turma of turmas) {
    for (const aluno of turma.alunos) {
      total++;
      const status = aluno.confirmacao?.status ?? "SEM_RESPOSTA";
      if (CONFIRMADOS.has(status)) confirmados++;
      else if (status === "SEM_RESPOSTA") semResposta++;
      else if (status === "NAO_IRAO") naoIrao++;
    }
  }
  return { total, confirmados, semResposta, naoIrao };
}

function ResumoPill({ icon: Icon, label, valor, cor }: { icon: React.ElementType; label: string; valor: number; cor: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[10px] border border-cda-border bg-cda-surface px-4 py-2.5">
      <Icon className="h-4 w-4 shrink-0" style={{ color: cor }} />
      <div>
        <p className="text-lg font-bold leading-none text-cda-text">{valor}</p>
        <p className="text-xs text-cda-text3">{label}</p>
      </div>
    </div>
  );
}

/** Input numérico compacto pra célula de tabela — salva no blur (não a cada
 * tecla), igual ao padrão de "editar e sair do campo" já usado no sistema. */
function CampoNumero({ valor, onSalvar, disabled }: { valor: number | null; onSalvar: (v: number | null) => void; disabled?: boolean }) {
  const [texto, setTexto] = useState(valor === null || valor === undefined ? "" : String(valor));
  return (
    <input
      type="number"
      min={0}
      inputMode="numeric"
      value={texto}
      disabled={disabled}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={() => onSalvar(texto === "" ? null : Number(texto))}
      className="h-8 w-16 rounded-md border border-cda-border bg-white px-2 text-sm text-cda-text outline-none focus:border-cda-blue disabled:opacity-50"
    />
  );
}

function CampoTexto({ valor, onSalvar, disabled, placeholder }: { valor: string | null; onSalvar: (v: string | null) => void; disabled?: boolean; placeholder?: string }) {
  const [texto, setTexto] = useState(valor ?? "");
  return (
    <input
      type="text"
      value={texto}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={() => onSalvar(texto.trim() || null)}
      className="h-8 w-24 rounded-md border border-cda-border bg-white px-2 text-sm text-cda-text outline-none focus:border-cda-blue disabled:opacity-50"
    />
  );
}

export function FestaFamiliaPainel({
  eventoId,
  turmasIniciais,
  podeEditar,
}: {
  eventoId: string;
  turmasIniciais: TurmaConfirmacoes[];
  podeEditar: boolean;
}) {
  const [turmas, setTurmas] = useState(turmasIniciais);
  const [salvando, setSalvando] = useState<string | null>(null);
  const resumo = resumoDe(turmas);

  function aplicarLocal(alunoId: string, patch: Patch) {
    setTurmas((prev) =>
      prev.map((turma) => ({
        ...turma,
        alunos: turma.alunos.map((aluno) =>
          aluno.alunoId !== alunoId
            ? aluno
            : {
                ...aluno,
                confirmacao: {
                  id: aluno.confirmacao?.id ?? "",
                  status: aluno.confirmacao?.status ?? "SEM_RESPOSTA",
                  adultos: aluno.confirmacao?.adultos ?? null,
                  criancas: aluno.confirmacao?.criancas ?? null,
                  horario: aluno.confirmacao?.horario ?? null,
                  compareceu: aluno.confirmacao?.compareceu ?? null,
                  observacao: aluno.confirmacao?.observacao ?? null,
                  ...patch,
                },
              }
        ),
      }))
    );
  }

  async function atualizar(alunoId: string, patch: Patch) {
    aplicarLocal(alunoId, patch);
    setSalvando(alunoId);
    try {
      const res = await fetch(`/api/festa-familia/${eventoId}/confirmacoes/${alunoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
    } catch {
      showToast("Não foi possível salvar. Tente de novo.", "error");
    } finally {
      setSalvando(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-3">
        <ResumoPill icon={Users} label="Total de alunos" valor={resumo.total} cor="var(--status-info)" />
        <ResumoPill icon={CheckCircle2} label="Confirmados" valor={resumo.confirmados} cor="var(--status-success)" />
        <ResumoPill icon={HelpCircle} label="Sem resposta" valor={resumo.semResposta} cor="var(--cda-text3)" />
        <ResumoPill icon={XCircle} label="Não irão" valor={resumo.naoIrao} cor="var(--status-danger)" />
      </div>

      {turmas.map((turma) => (
        <Card key={turma.turmaId} title={`${turma.turmaNome} (${turma.alunos.length})`}>
          {turma.alunos.length === 0 ? (
            <p className="px-5 py-6 text-sm text-cda-text3">Nenhum aluno matriculado nessa turma.</p>
          ) : (
            <Table>
              <TableHead>
                <Th>Aluno</Th>
                <Th>Status</Th>
                <Th>Adultos</Th>
                <Th>Crianças</Th>
                <Th>Horário</Th>
                <Th>Compareceu</Th>
              </TableHead>
              <TableBody>
                {turma.alunos.map((aluno) => {
                  const status = aluno.confirmacao?.status ?? "SEM_RESPOSTA";
                  const badge = STATUS_FESTA_FAMILIA_BADGE[status] ?? { variant: "neutral" as const, label: status };
                  const confirmado = CONFIRMADOS.has(status);
                  const carregando = salvando === aluno.alunoId;
                  return (
                    <Tr key={aluno.alunoId}>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <Avatar nome={aluno.nome} foto={aluno.foto} size="sm" />
                          <span className="font-medium text-cda-text">{aluno.nome}</span>
                        </div>
                      </Td>
                      <Td>
                        {podeEditar ? (
                          <FilterSelect
                            className="w-[190px]"
                            value={status}
                            disabled={carregando}
                            onChange={(valor) => atualizar(aluno.alunoId, { status: valor })}
                            placeholder="Status"
                            triggerStyle={{
                              ...BADGE_VARIANT_STYLE[badge.variant],
                              border: "none",
                              height: "32px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}
                            options={STATUS_OPTIONS}
                          />
                        ) : (
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        )}
                      </Td>
                      <Td>
                        {podeEditar && confirmado ? (
                          <CampoNumero
                            valor={aluno.confirmacao?.adultos ?? null}
                            disabled={carregando}
                            onSalvar={(v) => atualizar(aluno.alunoId, { adultos: v })}
                          />
                        ) : (
                          <span className="text-cda-text2">{aluno.confirmacao?.adultos ?? "—"}</span>
                        )}
                      </Td>
                      <Td>
                        {podeEditar && confirmado ? (
                          <CampoNumero
                            valor={aluno.confirmacao?.criancas ?? null}
                            disabled={carregando}
                            onSalvar={(v) => atualizar(aluno.alunoId, { criancas: v })}
                          />
                        ) : (
                          <span className="text-cda-text2">{aluno.confirmacao?.criancas ?? "—"}</span>
                        )}
                      </Td>
                      <Td>
                        {podeEditar && confirmado ? (
                          <CampoTexto
                            valor={aluno.confirmacao?.horario ?? null}
                            disabled={carregando}
                            placeholder="ex: 14h30"
                            onSalvar={(v) => atualizar(aluno.alunoId, { horario: v })}
                          />
                        ) : (
                          <span className="text-cda-text2">{aluno.confirmacao?.horario ?? "—"}</span>
                        )}
                      </Td>
                      <Td>
                        {podeEditar ? (
                          <input
                            type="checkbox"
                            checked={aluno.confirmacao?.compareceu ?? false}
                            disabled={carregando}
                            onChange={(e) => atualizar(aluno.alunoId, { compareceu: e.target.checked })}
                            className="h-4 w-4 rounded border-cda-border"
                          />
                        ) : (
                          <span className="text-cda-text2">{aluno.confirmacao?.compareceu ? "Sim" : "—"}</span>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      ))}
    </div>
  );
}
