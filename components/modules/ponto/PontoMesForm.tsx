"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Save, Loader2, ChevronLeft, ChevronRight, LayoutGrid, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ExportButtons } from "@/components/ui/ExportButtons";
import { IconButton } from "@/components/ui/IconButton";
import { calcularMes, minParaHora, OCORRENCIA_LABEL, type RegistroPontoDia } from "@/lib/ponto";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const OCORRENCIAS = Object.keys(OCORRENCIA_LABEL);

type Linha = {
  data: string; // yyyy-mm-dd
  entrada1: string;
  saida1: string;
  entrada2: string;
  saida2: string;
  entrada3: string;
  saida3: string;
  ocorrencia: string;
  observacao: string;
};

function linhaVazia(data: string): Linha {
  return { data, entrada1: "", saida1: "", entrada2: "", saida2: "", entrada3: "", saida3: "", ocorrencia: "NORMAL", observacao: "" };
}

function horaValida(v: string): string | null {
  if (!v.trim()) return null;
  return /^\d{1,2}:\d{2}$/.test(v.trim()) ? v.trim() : null;
}

function horaParaMinLocal(v: string): number | null {
  const h = horaValida(v);
  if (!h) return null;
  const [hh, mm] = h.split(":").map(Number);
  return hh * 60 + mm;
}

function ultimoDiaDoMes(mes: number, ano: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

export function PontoMesForm({
  funcionarioId,
  jornadaPrevistaMinutos,
}: {
  funcionarioId: string;
  jornadaPrevistaMinutos: number | null;
}) {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getUTCMonth() + 1);
  const [ano, setAno] = useState(hoje.getUTCFullYear());
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [saldoInicial, setSaldoInicial] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  // NOVO: modo "por dia" — grade inteira de 16 colunas era hostil pra quem só
  // lança o próprio ponto no dia a dia (professoras). Grade completa continua
  // disponível como modo avançado, pra RH/Financeiro conferir o mês inteiro.
  const [modo, setModo] = useState<"dia" | "grade">("dia");
  const [diaIndex, setDiaIndex] = useState(0);

  const jornada = jornadaPrevistaMinutos ?? 0;

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      setMensagem(null);
      const res = await fetch(`/api/ponto/${funcionarioId}?mes=${mes}&ano=${ano}`);
      const data = await res.json();
      if (cancelado) return;
      setSaldoInicial(data.saldoInicial ?? 0);
      const carregadas: Linha[] = (data.dias ?? []).map((d: {
        data: string; entrada1: number | null; saida1: number | null; entrada2: number | null;
        saida2: number | null; entrada3: number | null; saida3: number | null; ocorrencia: string; observacao: string | null;
      }) => ({
        data: d.data.slice(0, 10),
        entrada1: d.entrada1 != null ? minParaHora(d.entrada1) : "",
        saida1: d.saida1 != null ? minParaHora(d.saida1) : "",
        entrada2: d.entrada2 != null ? minParaHora(d.entrada2) : "",
        saida2: d.saida2 != null ? minParaHora(d.saida2) : "",
        entrada3: d.entrada3 != null ? minParaHora(d.entrada3) : "",
        saida3: d.saida3 != null ? minParaHora(d.saida3) : "",
        ocorrencia: d.ocorrencia,
        observacao: d.observacao ?? "",
      }));
      setLinhas(carregadas);
      setDiaIndex(0);
      setCarregando(false);
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [funcionarioId, mes, ano]);

  const calculados = useMemo(() => {
    const registros: RegistroPontoDia[] = linhas
      .filter((l) => l.data)
      .map((l) => ({
        data: new Date(`${l.data}T00:00:00.000Z`),
        entrada1: horaParaMinLocal(l.entrada1),
        saida1: horaParaMinLocal(l.saida1),
        entrada2: horaParaMinLocal(l.entrada2),
        saida2: horaParaMinLocal(l.saida2),
        entrada3: horaParaMinLocal(l.entrada3),
        saida3: horaParaMinLocal(l.saida3),
        ocorrencia: l.ocorrencia,
        observacao: l.observacao,
      }));
    return calcularMes(registros, jornada, saldoInicial);
  }, [linhas, jornada, saldoInicial]);

  const saldoFinal = calculados.length > 0 ? calculados[calculados.length - 1].saldoAcumulado : saldoInicial;

  // NOVO: Grade completa mostra o mês inteiro (todo dia 1 a 28/30/31), não só os
  // dias que já têm registro — antes um mês com 1 dia lançado só mostrava 1 linha,
  // dava a impressão de que o resto "sumiu" (pedido de quem confere ponto/RH).
  const todasAsDatas = useMemo(() => {
    const total = ultimoDiaDoMes(mes, ano);
    return Array.from({ length: total }, (_, i) => new Date(Date.UTC(ano, mes - 1, i + 1)).toISOString().slice(0, 10));
  }, [mes, ano]);

  function atualizarLinha(i: number, campo: keyof Linha, valor: string) {
    setLinhas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }

  // Dia do mês que ainda não tem linha em `linhas` (não foi lançado) — só vira
  // uma linha de verdade (e só aí entra no PUT de salvar) quando a pessoa
  // efetivamente digita algo nele. Até lá é só uma linha em branco na tela.
  function atualizarLinhaPorData(data: string, campo: keyof Linha, valor: string) {
    setLinhas((prev) => {
      const idx = prev.findIndex((l) => l.data === data);
      if (idx !== -1) return prev.map((l, i) => (i === idx ? { ...l, [campo]: valor } : l));
      const nova = { ...linhaVazia(data), [campo]: valor };
      return [...prev, nova].sort((a, b) => a.data.localeCompare(b.data));
    });
  }

  function removerLinhaPorData(data: string) {
    setLinhas((prev) => prev.filter((l) => l.data !== data));
  }

  function adicionarDia() {
    const ultimaData = linhas.length > 0 ? linhas[linhas.length - 1].data : null;
    let proxima: Date;
    if (ultimaData) {
      proxima = new Date(`${ultimaData}T00:00:00.000Z`);
      proxima.setUTCDate(proxima.getUTCDate() + 1);
    } else {
      proxima = new Date(Date.UTC(ano, mes - 1, 1));
    }
    setLinhas((prev) => [...prev, linhaVazia(proxima.toISOString().slice(0, 10))]);
  }

  function removerLinha(i: number) {
    setLinhas((prev) => prev.filter((_, idx) => idx !== i));
  }

  function diaAnterior() {
    setDiaIndex((i) => Math.max(0, i - 1));
  }

  function proximoDia() {
    if (diaIndex < linhas.length - 1) {
      setDiaIndex((i) => i + 1);
    } else {
      setDiaIndex(linhas.length);
      adicionarDia();
    }
  }

  function removerDiaAtual() {
    removerLinha(diaIndex);
    setDiaIndex((i) => Math.max(0, Math.min(i, linhas.length - 2)));
  }

  async function salvar() {
    setSalvando(true);
    setMensagem(null);
    const linhasValidas = linhas.filter((l) => l.data);
    for (const l of linhasValidas) {
      if (l.entrada1 && !horaValida(l.entrada1)) return alertaHora(l.entrada1);
      if (l.saida1 && !horaValida(l.saida1)) return alertaHora(l.saida1);
      if (l.entrada2 && !horaValida(l.entrada2)) return alertaHora(l.entrada2);
      if (l.saida2 && !horaValida(l.saida2)) return alertaHora(l.saida2);
      if (l.entrada3 && !horaValida(l.entrada3)) return alertaHora(l.entrada3);
      if (l.saida3 && !horaValida(l.saida3)) return alertaHora(l.saida3);
    }
    try {
      const res = await fetch(`/api/ponto/${funcionarioId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mes, ano, registros: linhasValidas }),
      });
      if (!res.ok) throw new Error();
      setMensagem("Salvo com sucesso.");
    } catch {
      setMensagem("Erro ao salvar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  function alertaHora(valor: string) {
    setSalvando(false);
    setMensagem(`Horário inválido: "${valor}". Use o formato HH:MM (ex.: 08:00).`);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-end justify-between gap-3 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Select label="Mês" value={mes} onChange={(e) => setMes(Number(e.target.value))} className="w-40">
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </Select>
          <Select label="Ano" value={ano} onChange={(e) => setAno(Number(e.target.value))} className="w-28">
            {[ano - 1, ano, ano + 1].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-cda-text2">Jornada prevista</span>
            <div className="flex h-10 items-center text-sm text-cda-text">
              {jornada ? minParaHora(jornada) : "não definida"}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-cda-text2">Saldo Banco de Horas</span>
            <div className="flex h-10 items-center">
              <Badge variant={saldoFinal < 0 ? "red" : saldoFinal > 0 ? "green" : "gray"}>{minParaHora(saldoFinal)}</Badge>
            </div>
          </div>
        </div>
        <ExportButtons href="/api/relatorios/ponto" params={{ funcionarioId, mes: String(mes), ano: String(ano) }} />
      </Card>

      {/* NOVO: alterna entre lançar 1 dia por vez (guiado, pra quem não tá à vontade
          com sistema) e a grade completa (16 colunas, pra RH/Financeiro conferir o
          mês inteiro de uma vez) — mesmo dado, duas formas de editar. */}
      <div className="flex gap-1 self-start rounded-lg border border-cda-border bg-white p-1">
        <button
          onClick={() => setModo("dia")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            modo === "dia" ? "bg-cda-blue text-white" : "text-cda-text2 hover:bg-cda-bg"
          }`}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Por dia
        </button>
        <button
          onClick={() => setModo("grade")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            modo === "grade" ? "bg-cda-blue text-white" : "text-cda-text2 hover:bg-cda-bg"
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Grade completa
        </button>
      </div>

      {modo === "dia" && !carregando && (
        <Card className="p-5">
          {linhas.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-cda-text3">Nenhum dia lançado neste mês ainda.</p>
              <Button size="sm" onClick={adicionarDia}>
                <Plus className="h-4 w-4" /> Lançar primeiro dia
              </Button>
            </div>
          ) : (
            (() => {
              const l = linhas[diaIndex];
              const dia = calculados.find((d) => d.data.toISOString().slice(0, 10) === l.data);
              const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                timeZone: "UTC",
              }).format(new Date(`${l.data}T00:00:00.000Z`));
              return (
                <div className="flex flex-col gap-5">
                  <div className="flex items-center justify-between gap-3">
                    <IconButton icon={ChevronLeft} label="Dia anterior" bordered disabled={diaIndex === 0} onClick={diaAnterior} />
                    <div className="text-center">
                      <p className="text-sm font-semibold capitalize text-cda-text">{dataFormatada}</p>
                      <p className="text-xs text-cda-text3">
                        Dia {diaIndex + 1} de {linhas.length} lançados
                      </p>
                    </div>
                    <IconButton icon={ChevronRight} label="Próximo dia" bordered onClick={proximoDia} />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {([
                      ["entrada1", "saida1", "1º período"],
                      ["entrada2", "saida2", "2º período"],
                      ["entrada3", "saida3", "3º período"],
                    ] as const).map(([campoEntrada, campoSaida, rotulo]) => (
                      <div key={rotulo} className="flex flex-col gap-1.5 rounded-lg border border-cda-border p-3">
                        <span className="text-xs font-medium text-cda-text2">{rotulo}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Entrada --:--"
                            value={l[campoEntrada]}
                            onChange={(e) => atualizarLinha(diaIndex, campoEntrada, e.target.value)}
                            className="h-10 w-full rounded-md border border-cda-border px-2 text-center text-sm outline-none focus:border-cda-blue"
                          />
                          <span className="text-cda-text3">–</span>
                          <input
                            type="text"
                            placeholder="Saída --:--"
                            value={l[campoSaida]}
                            onChange={(e) => atualizarLinha(diaIndex, campoSaida, e.target.value)}
                            className="h-10 w-full rounded-md border border-cda-border px-2 text-center text-sm outline-none focus:border-cda-blue"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Select
                      label="Ocorrência"
                      value={l.ocorrencia}
                      onChange={(e) => atualizarLinha(diaIndex, "ocorrencia", e.target.value)}
                    >
                      {OCORRENCIAS.map((o) => (
                        <option key={o} value={o}>{OCORRENCIA_LABEL[o]}</option>
                      ))}
                    </Select>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-cda-text2">Observação</label>
                      <input
                        type="text"
                        placeholder="reuniões, obs..."
                        value={l.observacao}
                        onChange={(e) => atualizarLinha(diaIndex, "observacao", e.target.value)}
                        className="h-10 w-full rounded-lg border border-cda-border px-3 text-sm outline-none focus:border-cda-blue"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-cda-border pt-4 sm:grid-cols-3 lg:grid-cols-6">
                    <div>
                      <p className="text-xs text-cda-text3">Previstas</p>
                      <p className="text-sm font-medium text-cda-text">{dia ? minParaHora(dia.horasPrevistas) : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-cda-text3">Trabalhadas</p>
                      <p className="text-sm font-medium text-cda-text">{dia ? minParaHora(dia.horasTrabalhadas) : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-cda-text3">Atraso/Falta</p>
                      {dia && dia.atrasoFalta > 0 ? <Badge variant="red">{minParaHora(dia.atrasoFalta)}</Badge> : <p className="text-sm text-cda-text3">—</p>}
                    </div>
                    <div>
                      <p className="text-xs text-cda-text3">Hora Extra</p>
                      {dia && dia.horaExtra > 0 ? <Badge variant="green">{minParaHora(dia.horaExtra)}</Badge> : <p className="text-sm text-cda-text3">—</p>}
                    </div>
                    <div>
                      <p className="text-xs text-cda-text3">Ad. Noturno</p>
                      <p className="text-sm font-medium text-cda-text">{dia && dia.adicionalNoturno > 0 ? minParaHora(dia.adicionalNoturno) : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-cda-text3">Saldo acumulado</p>
                      <p className="text-sm font-medium text-cda-text">{dia ? minParaHora(dia.saldoAcumulado) : "—"}</p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={removerDiaAtual}
                      className="flex items-center gap-1.5 text-xs font-medium text-cda-text3 hover:text-cda-red"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir este dia
                    </button>
                  </div>
                </div>
              );
            })()
          )}
        </Card>
      )}

      {modo === "grade" && (
      <Card className="overflow-x-auto p-0">
        {carregando ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-cda-text3">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <table className="w-full min-w-[1500px] text-sm">
            <thead>
              <tr className="border-b border-cda-border bg-cda-bg text-left text-xs font-semibold uppercase text-cda-text2">
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Entrada</th>
                <th className="px-3 py-2">Saída</th>
                <th className="px-3 py-2">Entrada</th>
                <th className="px-3 py-2">Saída</th>
                <th className="px-3 py-2">Entrada</th>
                <th className="px-3 py-2">Saída</th>
                <th className="px-3 py-2">Ocorrência</th>
                <th className="px-3 py-2">Observação</th>
                <th className="px-3 py-2">Horas Previstas</th>
                <th className="px-3 py-2">Horas Trabalhadas</th>
                <th className="px-3 py-2">Atraso/Falta</th>
                <th className="px-3 py-2">Hora Extra</th>
                <th className="px-3 py-2">Adicional Noturno</th>
                <th className="px-3 py-2">Saldo Banco de Horas</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {/* Uma linha por dia do mês inteiro (não só os já lançados) — dia sem
                  nada digitado é só visual até a pessoa começar a preencher; aí
                  vira uma linha de verdade (atualizarLinhaPorData cria na hora). */}
              {todasAsDatas.map((data) => {
                const l = linhas.find((x) => x.data === data) ?? linhaVazia(data);
                const lancado = linhas.some((x) => x.data === data);
                const dia = calculados.find((d) => d.data.toISOString().slice(0, 10) === data);
                const dataLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", weekday: "short", timeZone: "UTC" })
                  .format(new Date(`${data}T00:00:00.000Z`));
                return (
                  <tr key={data} className={`border-b border-cda-border last:border-0 ${lancado ? "" : "bg-cda-bg/40"}`}>
                    <td className="whitespace-nowrap px-3 py-1.5 text-sm capitalize text-cda-text2">{dataLabel}</td>
                    {(["entrada1", "saida1", "entrada2", "saida2", "entrada3", "saida3"] as const).map((campo) => (
                      <td key={campo} className="px-2 py-1.5">
                        <input
                          type="text"
                          placeholder="--:--"
                          value={l[campo]}
                          onChange={(e) => atualizarLinhaPorData(data, campo, e.target.value)}
                          className="h-8 w-16 rounded-md border border-cda-border px-2 text-center text-sm outline-none focus:border-cda-blue"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1.5">
                      <select
                        value={l.ocorrencia}
                        onChange={(e) => atualizarLinhaPorData(data, "ocorrencia", e.target.value)}
                        className="h-8 rounded-md border border-cda-border px-1.5 text-xs outline-none focus:border-cda-blue"
                      >
                        {OCORRENCIAS.map((o) => (
                          <option key={o} value={o}>{OCORRENCIA_LABEL[o]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        placeholder="reuniões, obs..."
                        value={l.observacao}
                        onChange={(e) => atualizarLinhaPorData(data, "observacao", e.target.value)}
                        className="h-8 w-32 rounded-md border border-cda-border px-2 text-sm outline-none focus:border-cda-blue"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-sm text-cda-text2">{dia ? minParaHora(dia.horasPrevistas) : "—"}</td>
                    <td className="px-3 py-1.5 text-sm text-cda-text2">{dia ? minParaHora(dia.horasTrabalhadas) : "—"}</td>
                    <td className="px-3 py-1.5">
                      {dia && dia.atrasoFalta > 0 && <Badge variant="red">{minParaHora(dia.atrasoFalta)}</Badge>}
                    </td>
                    <td className="px-3 py-1.5">
                      {dia && dia.horaExtra > 0 && <Badge variant="green">{minParaHora(dia.horaExtra)}</Badge>}
                    </td>
                    <td className="px-3 py-1.5 text-sm text-cda-text2">{dia && dia.adicionalNoturno > 0 ? minParaHora(dia.adicionalNoturno) : "—"}</td>
                    <td className="px-3 py-1.5 text-sm font-medium text-cda-text">{dia ? minParaHora(dia.saldoAcumulado) : "—"}</td>
                    <td className="px-2 py-1.5">
                      {lancado && (
                        <button
                          onClick={() => removerLinhaPorData(data)}
                          title="Remover lançamento deste dia"
                          aria-label="Remover lançamento deste dia"
                          className="text-cda-text3 hover:text-cda-red"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
      )}

      <div className="flex items-center justify-between">
        <span />
        <div className="flex items-center gap-3">
          {mensagem && <span className="text-xs text-cda-text2">{mensagem}</span>}
          <Button size="sm" onClick={salvar} loading={salvando}>
            <Save className="h-4 w-4" /> Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
