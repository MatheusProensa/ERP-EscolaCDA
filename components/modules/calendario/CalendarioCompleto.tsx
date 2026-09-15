"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, CalendarClock, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { showToast } from "@/components/ui/Toast";
import { ExportarCalendarioPdfModal } from "@/components/modules/calendario/ExportarCalendarioPdfModal";
import { EventoPopover } from "@/components/modules/calendario/EventoPopover";
import { MiniCalendario } from "@/components/modules/calendario/MiniCalendario";
import {
  CATEGORIAS_EVENTO,
  DIAS_SEMANA_ABREV,
  MESES,
  gerarGradeMes,
  mesmaData,
} from "@/lib/calendario";

type Evento = {
  id: string;
  titulo: string;
  data: string;
  categoria: string;
  descricao: string | null;
  responsavel?: string | null;
};

const MAX_EVENTOS_VISIVEIS = 2;
// Só existe essa categoria no banco (não tem "Feriado" e "Recesso"
// separados) — o rótulo da célula usa o nome real, não uma distinção que o
// dado não tem.
const CATEGORIA_FERIADO = "Recesso/Feriado";

// Paleta vibrante só desta tela (pedido do dono: as cores pastel de
// COR_CATEGORIA em lib/calendario.ts ficam apagadas demais aqui) — local de
// propósito, não mexe em lib/calendario.ts (usado também no PDF do
// calendário e no widget de eventos do Dashboard). dot reaproveita a cor do
// texto (mais saturada, boa pra um círculo pequeno).
// Cor FORTE (sólida) + texto branco — pedido do dono: pastel tava fraco
// demais, tanto nas pills do topo quanto nos chips de evento na grade.
const CORES_EVENTO_VIBRANTE: Record<string, string> = {
  "Organização Interna": "#d97706",
  "Eventos e Atividades": "#2563eb",
  Marketing: "#7c3aed",
  Reuniões: "#16a34a",
  "Datas Comemorativas": "#db2777",
  "Recesso/Feriado": "#475569",
};

function corCategoria(categoria: string): { bg: string; text: string; dot: string } {
  const bg = CORES_EVENTO_VIBRANTE[categoria] ?? CORES_EVENTO_VIBRANTE[CATEGORIA_FERIADO];
  return { bg, text: "#ffffff", dot: bg };
}

export function CalendarioCompleto({
  podeEditar,
  ocultarCategoria,
}: {
  podeEditar: boolean;
  /** Categoria pra esconder inteiramente — pill do topo E eventos (pedido
   * do dono: Calendário Pedagógico, /calendario/pedagogico, esconde
   * "Marketing"). Sem essa prop, comportamento idêntico ao Calendário
   * Geral de sempre. */
  ocultarCategoria?: string;
}) {
  const router = useRouter();
  // "Hoje" no fuso de quem tá vendo a tela (não UTC) — reconstruído como data
  // pura (meia-noite UTC) pra comparar certo com o resto da grade, que já usa
  // getUTCFullYear/Month/Date em cima de datas de calendário puras.
  const agora = new Date();
  const hoje = new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate()));
  const [mes, setMes] = useState(hoje.getUTCMonth() + 1);
  const [ano, setAno] = useState(hoje.getUTCFullYear());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [proximosEventos, setProximosEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState<{ aberto: boolean; evento?: Evento; dataPadrao?: string }>({ aberto: false });
  const [salvando, setSalvando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [erro, setErro] = useState("");
  // Redesign (pedido do dono, mockup de referência): pills de categoria
  // viram filtro — vazio = mostra tudo, senão só as categorias marcadas.
  const [categoriasFiltro, setCategoriasFiltro] = useState<Set<string>>(new Set());
  const [diasExpandidos, setDiasExpandidos] = useState<Set<string>>(new Set());
  const [popover, setPopover] = useState<{ evento: Evento; x: number; y: number } | null>(null);

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

  // "Próximos eventos" é independente do mês exibido no grid — sempre olha pra frente
  // a partir de hoje, mesmo cruzando pro mês seguinte, em vez de zerar quando o mês
  // atual está acabando.
  async function buscarProximos(): Promise<Evento[]> {
    const d = new Date();
    const hojeStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const res = await fetch(`/api/eventos?desde=${hojeStr}&limite=6`);
    return res.ok ? await res.json() : [];
  }

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      const dados = await buscarProximos();
      if (!cancelado) setProximosEventos(dados);
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, []);

  // Categoria escondida (Calendário Pedagógico) some daqui pra baixo inteira
  // — pill do topo (via categoriasVisiveis) e eventos (via eventosVisiveis),
  // antes de qualquer outro filtro entrar em jogo.
  const eventosVisiveis = useMemo(
    () => (ocultarCategoria ? eventos.filter((e) => e.categoria !== ocultarCategoria) : eventos),
    [eventos, ocultarCategoria]
  );
  const proximosVisiveis = useMemo(
    () => (ocultarCategoria ? proximosEventos.filter((e) => e.categoria !== ocultarCategoria) : proximosEventos),
    [proximosEventos, ocultarCategoria]
  );
  const categoriasVisiveis = useMemo(
    () => (ocultarCategoria ? CATEGORIAS_EVENTO.filter((c) => c !== ocultarCategoria) : CATEGORIAS_EVENTO),
    [ocultarCategoria]
  );

  const eventosFiltrados = useMemo(
    () => (categoriasFiltro.size === 0 ? eventosVisiveis : eventosVisiveis.filter((e) => categoriasFiltro.has(e.categoria))),
    [eventosVisiveis, categoriasFiltro]
  );
  const proximosFiltrados = useMemo(
    () => (categoriasFiltro.size === 0 ? proximosVisiveis : proximosVisiveis.filter((e) => categoriasFiltro.has(e.categoria))),
    [proximosVisiveis, categoriasFiltro]
  );

  const eventosPorDia = useMemo(() => {
    const mapa = new Map<string, Evento[]>();
    for (const e of eventosFiltrados) {
      const chave = e.data.slice(0, 10);
      const lista = mapa.get(chave) ?? [];
      lista.push(e);
      mapa.set(chave, lista);
    }
    return mapa;
  }, [eventosFiltrados]);

  // Contagem por categoria do mês exibido (pra badge nas pills) — sempre a
  // partir de TODOS os eventos visíveis do mês, não dos já filtrados (senão
  // a contagem de uma categoria desmarcada sumiria).
  const contagemPorCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const e of eventosVisiveis) mapa.set(e.categoria, (mapa.get(e.categoria) ?? 0) + 1);
    return mapa;
  }, [eventosVisiveis]);

  function alternarFiltro(categoria: string) {
    setCategoriasFiltro((atual) => {
      const novo = new Set(atual);
      if (novo.has(categoria)) novo.delete(categoria);
      else novo.add(categoria);
      return novo;
    });
  }

  // Pula o grid pro mês do evento clicado no painel "Próximos eventos".
  function irParaEvento(e: Evento) {
    const d = new Date(e.data);
    setMes(d.getUTCMonth() + 1);
    setAno(d.getUTCFullYear());
    if (podeEditar) abrirEditar(e);
  }

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
      publicarMural: fd.get("publicarMural") === "on",
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
    // NOVO — confirmação visual de sucesso
    showToast(modal.evento ? "Evento atualizado." : "Evento criado com sucesso.");
    router.refresh();
    setMes((m) => m);
    const r = await fetch(`/api/eventos?mes=${mes}&ano=${ano}`);
    setEventos(await r.json());
    buscarProximos().then(setProximosEventos);
  }

  async function excluir() {
    if (!modal.evento) return;
    setSalvando(true);
    await fetch(`/api/eventos/${modal.evento.id}`, { method: "DELETE" });
    setSalvando(false);
    setConfirmandoExclusao(false);
    setModal({ aberto: false });
    showToast("Evento removido.", "info");
    const r = await fetch(`/api/eventos?mes=${mes}&ano=${ano}`);
    setEventos(await r.json());
    buscarProximos().then(setProximosEventos);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3.5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconButton icon={ChevronLeft} label="Mês anterior" bordered onClick={() => mudarMes(-1)} />
            <Select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="w-[130px]">
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </Select>
            <Select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="w-[84px]">
              {[ano - 1, ano, ano + 1].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </Select>
            <IconButton icon={ChevronRight} label="Próximo mês" bordered onClick={() => mudarMes(1)} />
          </div>

          {/* NOVO: Exportar PDF junto do Novo evento, os 2 botões de ação da
              tela no mesmo lugar (mockup de referência) — antes Exportar
              vivia solto no header da página. */}
          <div className="flex items-center gap-2">
            <ExportarCalendarioPdfModal />
            {podeEditar && (
              <Button size="sm" onClick={() => abrirNovo()}>
                <Plus className="h-4 w-4" /> Novo evento
              </Button>
            )}
          </div>
        </div>

        {/* Pills de categoria — filtro clicável, cor forte + texto branco
            sempre (pedido do dono: pastel/contorno cinza tava fraco demais).
            Sem filtro nenhum marcado = todas em opacidade cheia; com algum
            filtro ativo, as não marcadas ficam esmaecidas (continuam com a
            MESMA cor forte, só mais apagadas, nunca viram cinza). */}
        <div className="flex flex-wrap gap-2 border-t border-cda-border pt-3">
          {categoriasVisiveis.map((cat) => {
            const cor = corCategoria(cat);
            const ativa = categoriasFiltro.has(cat);
            const esmaecida = categoriasFiltro.size > 0 && !ativa;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => alternarFiltro(cat)}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-opacity ${
                  esmaecida ? "opacity-45 hover:opacity-75" : "opacity-100"
                } ${ativa ? "ring-2 ring-offset-1" : ""}`}
                style={{ backgroundColor: cor.bg, color: cor.text, ["--tw-ring-color" as string]: cor.bg }}
              >
                {cat}
                <span>{contagemPorCategoria.get(cat) ?? 0}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Split 70/30 (mockup de referência) — grade à esquerda, sidebar
          (Próximos eventos + Mini calendário) à direita. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[7fr_3fr]">
        <Card className="overflow-x-auto p-0">
          {carregando ? (
            <div className="p-10 text-center text-sm text-cda-text3">Carregando...</div>
          ) : (
            <div key={`${ano}-${mes}`} className="grid min-w-[700px] grid-cols-7 gap-px bg-cda-border">
              {DIAS_SEMANA_ABREV.map((d) => (
                <div key={d} className="bg-white py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-cda-text3">
                  {d}
                </div>
              ))}
              {grade.map(({ data, doMesAtual }, i) => {
                const chave = data.toISOString().slice(0, 10);
                const eventosDoDia = eventosPorDia.get(chave) ?? [];
                const ehHoje = mesmaData(data, hoje);
                const ehFeriado = eventosDoDia.some((e) => e.categoria === CATEGORIA_FERIADO);
                const ehFimDeSemana = data.getUTCDay() === 0 || data.getUTCDay() === 6;
                // 3 fundos por célula (pedido do dono, "CRÍTICO"): feriado/
                // recesso > fim de semana > dia normal — só pros dias do mês
                // exibido (fora do mês mantém o cinza claro de sempre).
                const fundo = !doMesAtual ? undefined : ehFeriado ? "#e8edf5" : ehFimDeSemana ? "#f1f5f9" : "#ffffff";
                const expandido = diasExpandidos.has(chave);
                const visiveis = expandido ? eventosDoDia : eventosDoDia.slice(0, MAX_EVENTOS_VISIVEIS);
                const restantes = eventosDoDia.length - visiveis.length;

                return (
                  <div
                    key={i}
                    className={`group min-h-[108px] p-1.5 ${!doMesAtual ? "bg-cda-bg/50" : ""}`}
                    style={fundo ? { backgroundColor: fundo } : undefined}
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
                          aria-label="Novo evento neste dia"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {ehFeriado && doMesAtual && (
                      <p className="mb-1 flex items-center gap-1 truncate text-[10px] font-semibold text-[#4a5b7d]">
                        📅 {CATEGORIA_FERIADO}
                      </p>
                    )}
                    <div className="flex flex-col gap-0.5">
                      {visiveis.map((e) => {
                        const cor = corCategoria(e.categoria);
                        return (
                          <button
                            key={e.id}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setPopover({ evento: e, x: ev.clientX, y: ev.clientY });
                            }}
                            // NOVO: sem truncate — o texto quebra linha em vez
                            // de cortar (pedido do dono: "eventos sem corte").
                            className="rounded px-1.5 py-1 text-left text-[10.5px] font-medium leading-tight transition-shadow hover:shadow-sm"
                            style={{ backgroundColor: cor.bg, color: cor.text }}
                          >
                            {e.titulo}
                          </button>
                        );
                      })}
                      {restantes > 0 && (
                        <button
                          type="button"
                          onClick={() => setDiasExpandidos((atual) => new Set(atual).add(chave))}
                          className="px-1.5 text-left text-[10px] font-medium text-cda-text3 hover:text-cda-text2"
                        >
                          ver mais {restantes}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-5">
          <Card
            title={
              <span className="flex items-center gap-2">
                <CalendarClock className="h-[15px] w-[15px] text-cda-blue" />
                Próximos eventos
              </span>
            }
          >
            <div className="flex flex-col">
              {proximosFiltrados.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-cda-text3">Nenhum evento nos próximos dias.</p>
              )}
              {proximosFiltrados.map((e, i) => (
                <button
                  key={e.id}
                  onClick={() => irParaEvento(e)}
                  className={`flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-cda-bg ${i > 0 ? "border-t border-cda-border" : ""}`}
                >
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: corCategoria(e.categoria).dot }} />
                  <div className="min-w-0 flex-1">
                    {/* NOVO: sem truncate — título completo (pedido do dono) */}
                    <p className="text-sm text-cda-text">{e.titulo}</p>
                    <p className="mt-0.5 text-xs text-cda-text3">
                      {new Date(e.data).toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "short" })}
                      {e.responsavel ? ` · ${e.responsavel}` : ""}
                    </p>
                    <span
                      className="mt-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: corCategoria(e.categoria).bg, color: corCategoria(e.categoria).text }}
                    >
                      {e.categoria}
                    </span>
                  </div>
                  {e.responsavel && <Avatar nome={e.responsavel} size="sm" />}
                </button>
              ))}
            </div>
          </Card>

          {/* NOVO: mini calendário compacto (mockup de referência) — mesmo
              mês/ano do calendário principal, hoje em destaque. */}
          <Card
            title={
              <span className="flex items-center gap-2">
                <CalendarDays className="h-[15px] w-[15px] text-cda-blue" />
                Mini calendário
              </span>
            }
          >
            <MiniCalendario ano={ano} mes={mes} hoje={hoje} />
          </Card>
        </div>
      </div>

      {popover && (
        <EventoPopover
          evento={popover.evento}
          x={popover.x}
          y={popover.y}
          podeEditar={podeEditar}
          onFechar={() => setPopover(null)}
          onEditar={() => {
            const evento = popover.evento;
            setPopover(null);
            abrirEditar(evento);
          }}
          onExcluir={() => {
            const evento = popover.evento;
            setPopover(null);
            setModal({ aberto: false, evento });
            setConfirmandoExclusao(true);
          }}
        />
      )}

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
          {!modal.evento && (
            <label className="flex items-center gap-2 text-sm text-cda-text2">
              <input type="checkbox" name="publicarMural" className="h-4 w-4 rounded border-cda-border" />
              Publicar no mural também
            </label>
          )}
          {erro && <p className="text-sm text-cda-red">{erro}</p>}
          <div className="flex items-center justify-between gap-3">
            {modal.evento ? (
              <Button type="button" variant="danger" size="sm" onClick={() => setConfirmandoExclusao(true)} loading={salvando}>
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

      <ConfirmDialog
        open={confirmandoExclusao}
        onClose={() => setConfirmandoExclusao(false)}
        onConfirm={excluir}
        title={`Remover o evento "${modal.evento?.titulo}"?`}
        confirmLabel="Remover"
        loading={salvando}
      />
    </div>
  );
}
