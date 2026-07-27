"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  CATEGORIAS_EVENTO,
  DIAS_SEMANA_ABREV,
  MESES,
  corCategoria,
  gerarGradeMes,
  mesmaData,
} from "@/lib/calendario";

type Evento = {
  id: string;
  titulo: string;
  data: string;
  categoria: string;
  descricao: string | null;
};

export function CalendarioCompleto({ podeEditar }: { podeEditar: boolean }) {
  const router = useRouter();
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getUTCMonth() + 1);
  const [ano, setAno] = useState(hoje.getUTCFullYear());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState<{ aberto: boolean; evento?: Evento; dataPadrao?: string }>({ aberto: false });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const grade = useMemo(() => gerarGradeMes(ano, mes), [ano, mes]);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      const res = await fetch(`/api/eventos?mes=${mes}&ano=${ano}`);
      const data = await res.json();
      if (!cancelado) {
        setEventos(data);
        setCarregando(false);
      }
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [mes, ano]);

  const eventosPorDia = useMemo(() => {
    const mapa = new Map<string, Evento[]>();
    for (const e of eventos) {
      const chave = e.data.slice(0, 10);
      const lista = mapa.get(chave) ?? [];
      lista.push(e);
      mapa.set(chave, lista);
    }
    return mapa;
  }, [eventos]);

  function mudarMes(delta: number) {
    let novoMes = mes + delta;
    let novoAno = ano;
    if (novoMes < 1) {
      novoMes = 12;
      novoAno -= 1;
    } else if (novoMes > 12) {
      novoMes = 1;
      novoAno += 1;
    }
    setMes(novoMes);
    setAno(novoAno);
  }

  function abrirNovo(dataPadrao?: string) {
    setErro("");
    setModal({ aberto: true, dataPadrao });
  }

  function abrirEditar(evento: Evento) {
    setErro("");
    setModal({ aberto: true, evento });
  }

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      titulo: fd.get("titulo"),
      data: fd.get("data"),
      categoria: fd.get("categoria"),
      descricao: fd.get("descricao") || null,
    };

    const url = modal.evento ? `/api/eventos/${modal.evento.id}` : "/api/eventos";
    const method = modal.evento ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSalvando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível salvar o evento.");
      return;
    }
    setModal({ aberto: false });
    router.refresh();
    setMes((m) => m);
    const r = await fetch(`/api/eventos?mes=${mes}&ano=${ano}`);
    setEventos(await r.json());
  }

  async function excluir() {
    if (!modal.evento) return;
    if (!confirm(`Remover o evento "${modal.evento.titulo}"?`)) return;
    setSalvando(true);
    await fetch(`/api/eventos/${modal.evento.id}`, { method: "DELETE" });
    setSalvando(false);
    setModal({ aberto: false });
    const r = await fetch(`/api/eventos?mes=${mes}&ano=${ano}`);
    setEventos(await r.json());
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => mudarMes(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-cda-border text-cda-text2 hover:bg-cda-bg"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <Select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="w-40">
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </Select>
          <Select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="w-28">
            {[ano - 1, ano, ano + 1].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
          <button
            onClick={() => mudarMes(1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-cda-border text-cda-text2 hover:bg-cda-bg"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {CATEGORIAS_EVENTO.map((cat) => {
            const cor = corCategoria(cat);
            return (
              <div key={cat} className="flex items-center gap-1.5 text-xs text-cda-text2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cor.dot }} />
                {cat}
              </div>
            );
          })}
        </div>

        {podeEditar && (
          <Button size="sm" onClick={() => abrirNovo()}>
            <Plus className="h-4 w-4" /> Novo evento
          </Button>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        {carregando ? (
          <div className="p-10 text-center text-sm text-cda-text3">Carregando...</div>
        ) : (
          <div className="grid grid-cols-7 gap-px bg-cda-border">
            {DIAS_SEMANA_ABREV.map((d) => (
              <div key={d} className="bg-cda-bg py-2 text-center text-xs font-semibold uppercase text-cda-text3">
                {d}
              </div>
            ))}
            {grade.map(({ data, doMesAtual }, i) => {
              const chave = data.toISOString().slice(0, 10);
              const eventosDoDia = eventosPorDia.get(chave) ?? [];
              const ehHoje = mesmaData(data, hoje);
              return (
                <div
                  key={i}
                  className={`min-h-[110px] bg-white p-1.5 ${!doMesAtual ? "bg-cda-bg/50" : ""}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                        ehHoje ? "bg-cda-blue font-bold text-white" : doMesAtual ? "text-cda-text" : "text-cda-text3"
                      }`}
                    >
                      {data.getUTCDate()}
                    </span>
                    {podeEditar && (
                      <button
                        onClick={() => abrirNovo(chave)}
                        className="text-cda-text3 opacity-0 hover:text-cda-blue group-hover:opacity-100"
                        title="Novo evento neste dia"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {eventosDoDia.map((e) => {
                      const cor = corCategoria(e.categoria);
                      return (
                        <button
                          key={e.id}
                          onClick={() => podeEditar && abrirEditar(e)}
                          title={e.titulo}
                          className="truncate rounded px-1 py-0.5 text-left text-[10px] leading-tight"
                          style={{ backgroundColor: cor.bg, color: cor.text }}
                        >
                          {e.titulo}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        open={modal.aberto}
        onClose={() => setModal({ aberto: false })}
        title={modal.evento ? "Editar evento" : "Novo evento"}
      >
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <Input label="Título" name="titulo" required defaultValue={modal.evento?.titulo} placeholder="Reunião de pais" />
          <Input
            label="Data"
            name="data"
            type="date"
            required
            defaultValue={modal.evento?.data.slice(0, 10) ?? modal.dataPadrao}
          />
          <Select label="Categoria" name="categoria" required defaultValue={modal.evento?.categoria ?? ""}>
            <option value="" disabled>
              Selecione a categoria
            </option>
            {CATEGORIAS_EVENTO.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
          <Input label="Descrição (opcional)" name="descricao" defaultValue={modal.evento?.descricao ?? ""} />
          {erro && <p className="text-sm text-cda-red">{erro}</p>}
          <div className="flex items-center justify-between gap-3">
            {modal.evento ? (
              <Button type="button" variant="danger" size="sm" onClick={excluir} loading={salvando}>
                Excluir
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setModal({ aberto: false })}>
                Cancelar
              </Button>
              <Button type="submit" loading={salvando}>
                Salvar
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
