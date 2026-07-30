"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Send, FileText, ArrowLeft, Search, Check, CheckCheck } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { FileUpload } from "@/components/ui/FileUpload";
import { ROLE_LABEL } from "@/lib/permissoes";
import { formatarDataHora } from "@/lib/utils";

type Conversa = {
  id: string;
  name: string;
  role: string;
  ultimaMensagem: string | null;
  ultimaEm: string | null;
  naoLidas: number;
  online?: boolean;
};

type Mensagem = {
  id: string;
  remetenteId: string;
  destinatarioId: string;
  conteudo: string | null;
  anexo: string | null;
  anexoNome: string | null;
  createdAt: string;
  lida: boolean;
};

/** "Hoje" / "Ontem" / "23 de julho" — separador de data entre grupos de mensagens. */
function rotuloData(data: Date): string {
  const hoje = new Date();
  const meiaNoite = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDias = Math.round((meiaNoite(hoje) - meiaNoite(data)) / 86400000);
  if (diffDias === 0) return "Hoje";
  if (diffDias === 1) return "Ontem";
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: data.getFullYear() !== hoje.getFullYear() ? "numeric" : undefined,
  });
}

type ItemRenderizavel =
  | { tipo: "data"; label: string; key: string }
  | { tipo: "msg"; mensagem: Mensagem; mostrarCabecalho: boolean; key: string };

/** Agrupa mensagens por dia (separador) e junta mensagens seguidas do mesmo remetente
 * em menos de 3min num só "bloco" visual (só a primeira mostra avatar + nome). */
function montarItens(mensagens: Mensagem[]): ItemRenderizavel[] {
  const itens: ItemRenderizavel[] = [];
  let diaAnterior = "";
  let remetenteAnterior = "";
  let horaAnterior = 0;

  for (const m of mensagens) {
    const data = new Date(m.createdAt);
    const diaChave = data.toDateString();
    if (diaChave !== diaAnterior) {
      itens.push({ tipo: "data", label: rotuloData(data), key: `data-${diaChave}` });
      diaAnterior = diaChave;
      remetenteAnterior = "";
    }
    const seguidaDoMesmo = m.remetenteId === remetenteAnterior && data.getTime() - horaAnterior < 3 * 60 * 1000;
    itens.push({ tipo: "msg", mensagem: m, mostrarCabecalho: !seguidaDoMesmo, key: m.id });
    remetenteAnterior = m.remetenteId;
    horaAnterior = data.getTime();
  }
  return itens;
}

/** Anexa `novas` a `atual` ignorando ids repetidos — segunda camada de proteção
 * contra duplicata (ex.: polling e envio local competindo pela mesma mensagem). */
function mesclarMensagens(atual: Mensagem[], novas: Mensagem[]): Mensagem[] {
  const idsExistentes = new Set(atual.map((m) => m.id));
  const semDuplicata = novas.filter((m) => !idsExistentes.has(m.id));
  return semDuplicata.length > 0 ? [...atual, ...semDuplicata] : atual;
}

export function ChatApp({
  meId,
  meNome,
  selecionadoInicial,
  conversasIniciais,
}: {
  meId: string;
  /** NOVO: precisa do nome de quem está logado pra rotular o próprio balão de mensagem. */
  meNome: string;
  selecionadoInicial?: string;
  conversasIniciais?: Conversa[];
}) {
  const [conversas, setConversas] = useState<Conversa[]>(conversasIniciais ?? []);
  const [carregandoConversas, setCarregandoConversas] = useState(!conversasIniciais);
  const [erroConversas, setErroConversas] = useState(false);
  const [buscaConversa, setBuscaConversa] = useState("");
  const [selecionado, setSelecionado] = useState<string | null>(selecionadoInicial ?? null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [anexo, setAnexo] = useState<{ dados: string; nome: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);
  const ultimaMensagemEmRef = useRef<string | null>(null);
  /** Id da conversa a que `mensagens` pertence de fato — evita mostrar mensagens
   * da conversa anterior por baixo do cabeçalho da conversa nova recém-clicada. */
  const [mensagensDeId, setMensagensDeId] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function carregarConversas() {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/chat");
        if (!res.ok) throw new Error("resposta não-ok");
        const dados = await res.json();
        if (cancelado) return;
        setConversas(dados);
        setErroConversas(false);
      } catch {
        if (!cancelado) setErroConversas(true);
      } finally {
        if (!cancelado) setCarregandoConversas(false);
      }
    }
    carregarConversas();
    const intervalo = setInterval(carregarConversas, 15000);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, []);

  useEffect(() => {
    if (!selecionado) return;
    let cancelado = false;
    ultimaMensagemEmRef.current = null;
    const idConversa = selecionado;

    async function carregarMensagens(incremental: boolean) {
      if (incremental && document.hidden) return;
      const desde = incremental && ultimaMensagemEmRef.current ? `?desde=${encodeURIComponent(ultimaMensagemEmRef.current)}` : "";
      const res = await fetch(`/api/chat/${idConversa}${desde}`);
      if (!res.ok || cancelado) return;
      const novas: Mensagem[] = await res.json();

      if (!incremental) {
        // Troca de conversa: só substitui quando os dados novos chegam — mantém as
        // mensagens antigas na tela até lá, em vez de piscar pra uma lista vazia.
        if (novas.length > 0) ultimaMensagemEmRef.current = novas[novas.length - 1].createdAt;
        setMensagensDeId(idConversa);
        setMensagens(novas);
        return;
      }

      if (novas.length === 0) return;
      ultimaMensagemEmRef.current = novas[novas.length - 1].createdAt;
      setMensagens((atual) => mesclarMensagens(atual, novas));
    }

    carregarMensagens(false);
    const intervalo = setInterval(() => carregarMensagens(true), 4000);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [selecionado]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end" });
  }, [mensagens]);

  function selecionar(userId: string) {
    setSelecionado(userId);
    // Atualiza a URL sem navegação do Next (evita re-render do Server Component
    // e um novo round-trip de listarConversas a cada troca de conversa — o
    // ChatApp já é autossuficiente e gerencia os dados via polling próprio).
    window.history.replaceState(null, "", `/chat/${userId}`);
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!selecionado || (!texto.trim() && !anexo) || enviando) return;

    setEnviando(true);
    const res = await fetch(`/api/chat/${selecionado}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conteudo: texto.trim() || null,
        anexo: anexo?.dados ?? null,
        anexoNome: anexo?.nome ?? null,
      }),
    });
    setEnviando(false);

    if (res.ok) {
      const nova = await res.json();
      // Avança o cursor de polling pra essa mensagem já entrar como "vista" —
      // sem isso, o próximo poll buscava "tudo desde X" (X ainda apontando
      // pra antes dela) e a mesma mensagem voltava duplicada.
      ultimaMensagemEmRef.current = nova.createdAt;
      setMensagens((atual) => mesclarMensagens(atual, [nova]));
      setTexto("");
      setAnexo(null);
    }
  }

  const conversaAtual = conversas.find((c) => c.id === selecionado);
  const conversasFiltradas = useMemo(() => {
    const termo = buscaConversa.trim().toLowerCase();
    if (!termo) return conversas;
    return conversas.filter((c) => c.name.toLowerCase().includes(termo));
  }, [conversas, buscaConversa]);
  const itensConversa = useMemo(() => montarItens(mensagens), [mensagens]);
  const trocandoConversa = selecionado !== mensagensDeId;

  return (
    <div className="mt-2 flex min-h-0 flex-1 overflow-hidden rounded-[10px] border border-cda-border bg-cda-surface">
      <div className={`flex w-full shrink-0 flex-col border-r border-cda-border sm:w-72 ${selecionado ? "hidden sm:flex" : ""}`}>
        <div className="border-b border-cda-border p-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cda-text3" />
            <input
              type="text"
              value={buscaConversa}
              onChange={(e) => setBuscaConversa(e.target.value)}
              placeholder="Buscar conversa..."
              aria-label="Buscar conversa"
              className="h-8 w-full rounded-lg border border-cda-border bg-cda-bg pl-8 pr-2.5 text-sm text-cda-text placeholder:text-cda-text3 outline-none transition-colors focus:border-cda-blue focus:bg-white"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {carregandoConversas &&
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 border-b border-cda-border px-4 py-3">
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-cda-bg" />
                <div className="flex-1">
                  <div className="h-3 w-24 animate-pulse rounded bg-cda-bg" />
                  <div className="mt-2 h-2.5 w-32 animate-pulse rounded bg-cda-bg" />
                </div>
              </div>
            ))}
          {!carregandoConversas && erroConversas && conversas.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-cda-red">
              Não foi possível carregar. Tentando de novo em instantes...
            </p>
          )}
          {!carregandoConversas && !erroConversas && conversas.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-cda-text3">Nenhum outro perfil cadastrado.</p>
          )}
          {!carregandoConversas && conversas.length > 0 && conversasFiltradas.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-cda-text3">Nenhuma conversa com esse nome.</p>
          )}
          {conversasFiltradas.map((c) => (
            <button
              key={c.id}
              onClick={() => selecionar(c.id)}
              className={`flex w-full items-center gap-3 border-b border-cda-border px-4 py-3 text-left transition-colors hover:bg-cda-bg ${
                selecionado === c.id ? "bg-cda-bg" : ""
              }`}
            >
              <div className="relative shrink-0">
                <Avatar nome={c.name} size="md" />
                {c.online && (
                  <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-cda-green" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`truncate text-sm ${c.naoLidas > 0 ? "font-bold text-cda-text" : "font-semibold text-cda-text"}`}>
                    {c.name}
                  </span>
                  {c.ultimaEm && (
                    <span className="shrink-0 text-[11px] text-cda-text3">{formatarDataHora(c.ultimaEm).split(" ").pop()}</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-xs ${c.naoLidas > 0 ? "font-medium text-cda-text2" : "text-cda-text3"}`}>
                    {c.ultimaMensagem || (ROLE_LABEL[c.role] ?? c.role)}
                  </p>
                  {c.naoLidas > 0 && (
                    <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-cda-red px-1 text-[11px] font-bold text-white">
                      {c.naoLidas}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={`flex min-w-0 flex-1 flex-col bg-cda-bg ${selecionado ? "" : "hidden sm:flex"}`}>
        {!selecionado ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-cda-text3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white">
              <Send className="h-5 w-5 text-cda-text3" />
            </div>
            Selecione um perfil pra conversar.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-cda-border bg-white px-4 py-3">
              <button onClick={() => setSelecionado(null)} className="text-cda-text2 hover:text-cda-text sm:hidden">
                <ArrowLeft className="h-4 w-4" />
              </button>
              {conversaAtual ? (
                <>
                  <div className="relative">
                    <Avatar nome={conversaAtual.name} size="sm" />
                    {conversaAtual.online && (
                      <span className="absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border-2 border-white bg-cda-green" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-cda-text">{conversaAtual.name}</p>
                    <p className={`flex items-center gap-1 text-xs ${conversaAtual.online ? "text-cda-green" : "text-cda-text3"}`}>
                      {conversaAtual.online && <span className="h-1.5 w-1.5 rounded-full bg-cda-green" />}
                      {conversaAtual.online ? "Online" : ROLE_LABEL[conversaAtual.role] ?? conversaAtual.role}
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-cda-bg" />
                  <div className="h-3 w-28 animate-pulse rounded bg-cda-bg" />
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="mx-auto flex w-full max-w-2xl flex-col gap-0.5">
                {trocandoConversa
                  ? [1, 2, 3].map((i) => (
                      <div key={i} className={`flex items-end gap-2 ${i === 2 ? "flex-row-reverse" : ""} mt-2.5`}>
                        <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-white/70" />
                        <div className={`h-9 w-40 animate-pulse rounded-xl bg-white/70`} />
                      </div>
                    ))
                  : itensConversa.map((item) => {
                  if (item.tipo === "data") {
                    return (
                      <div key={item.key} className="my-3 flex items-center justify-center">
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-cda-text3 shadow-sm">
                          {item.label}
                        </span>
                      </div>
                    );
                  }

                  const m = item.mensagem;
                  const minha = m.remetenteId === meId;
                  const nome = minha ? meNome : conversaAtual?.name ?? "";
                  const imagem = m.anexo?.startsWith("data:image") ?? false;

                  return (
                    <div key={item.key} className={`flex items-end gap-2 ${minha ? "flex-row-reverse" : ""} ${item.mostrarCabecalho ? "mt-2.5" : ""}`}>
                      {item.mostrarCabecalho ? (
                        <Avatar nome={nome} size="sm" />
                      ) : (
                        <div className="w-7 shrink-0" />
                      )}
                      <div className={`flex max-w-[70%] flex-col ${minha ? "items-end" : "items-start"}`}>
                        {item.mostrarCabecalho && (
                          <span className="mb-0.5 text-[11px] font-semibold text-cda-text3">{nome}</span>
                        )}
                        <div
                          className={`rounded-xl px-3 py-2 text-sm shadow-sm ${
                            minha ? "rounded-br-sm bg-cda-blue text-white" : "rounded-bl-sm bg-white text-cda-text"
                          }`}
                        >
                          {m.conteudo && <p className="whitespace-pre-wrap">{m.conteudo}</p>}
                          {m.anexo &&
                            (imagem ? (
                              <a href={m.anexo} target="_blank" rel="noreferrer" title="Ver imagem em tamanho real">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={m.anexo}
                                  alt={m.anexoNome ?? "Imagem enviada"}
                                  className="mt-1 max-h-52 w-full rounded-lg object-cover"
                                />
                              </a>
                            ) : (
                              <a
                                href={m.anexo}
                                download={m.anexoNome ?? "anexo"}
                                className={`mt-1 flex items-center gap-1.5 text-xs underline ${minha ? "text-white" : "text-cda-blue"}`}
                              >
                                <FileText className="h-3.5 w-3.5" />
                                {m.anexoNome}
                              </a>
                            ))}
                          <div
                            className={`mt-1 flex items-center gap-1 text-[10px] ${
                              minha ? "justify-end text-white/70" : "text-cda-text3"
                            }`}
                          >
                            {formatarDataHora(m.createdAt).split(" ").pop()}
                            {minha && (m.lida ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={fimRef} />
              </div>
            </div>

            <form onSubmit={enviar} className="border-t border-cda-border bg-white p-3">
              <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
                {anexo && (
                  <div className="flex items-center gap-2 text-xs text-cda-text2">
                    <FileText className="h-3.5 w-3.5" />
                    {anexo.nome}
                    <button type="button" onClick={() => setAnexo(null)} className="text-cda-red hover:underline">
                      remover
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-1 rounded-full border border-cda-border bg-cda-bg px-1.5">
                    <FileUpload
                      maxSizeMB={3}
                      label=""
                      onSelect={(dados, nome) => setAnexo({ dados, nome })}
                      disabled={enviando}
                    />
                    <input
                      type="text"
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      placeholder="Escreva uma mensagem..."
                      aria-label="Escreva uma mensagem"
                      className="h-9 flex-1 border-none bg-transparent px-1 text-sm text-cda-text outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={enviando || (!texto.trim() && !anexo)}
                    aria-label="Enviar mensagem"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cda-blue text-white transition-colors disabled:bg-cda-bg disabled:text-cda-text3"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
