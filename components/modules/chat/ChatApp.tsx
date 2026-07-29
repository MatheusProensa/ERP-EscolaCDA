"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Send, FileText, ArrowLeft } from "lucide-react";
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
};

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
  const router = useRouter();
  const [conversas, setConversas] = useState<Conversa[]>(conversasIniciais ?? []);
  const [carregandoConversas, setCarregandoConversas] = useState(!conversasIniciais);
  const [erroConversas, setErroConversas] = useState(false);
  const [selecionado, setSelecionado] = useState<string | null>(selecionadoInicial ?? null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [anexo, setAnexo] = useState<{ dados: string; nome: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);
  const ultimaMensagemEmRef = useRef<string | null>(null);

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

    async function carregarMensagens(incremental: boolean) {
      if (incremental && document.hidden) return;
      const desde = incremental && ultimaMensagemEmRef.current ? `?desde=${encodeURIComponent(ultimaMensagemEmRef.current)}` : "";
      const res = await fetch(`/api/chat/${selecionado}${desde}`);
      if (!res.ok || cancelado) return;
      const novas: Mensagem[] = await res.json();
      if (novas.length === 0) return;

      ultimaMensagemEmRef.current = novas[novas.length - 1].createdAt;
      setMensagens((atual) => (incremental ? [...atual, ...novas] : novas));
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
    setMensagens([]);
    router.replace(`/chat/${userId}`);
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
      setMensagens((atual) => [...atual, nova]);
      setTexto("");
      setAnexo(null);
    }
  }

  const conversaAtual = conversas.find((c) => c.id === selecionado);

  return (
    <div className="mt-2 flex min-h-0 flex-1 overflow-hidden rounded-[10px] border border-cda-border bg-cda-surface">
      <div className={`w-full shrink-0 overflow-y-auto border-r border-cda-border sm:w-72 ${selecionado ? "hidden sm:block" : ""}`}>
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
        {conversas.map((c) => (
          <button
            key={c.id}
            onClick={() => selecionar(c.id)}
            className={`flex w-full items-center gap-3 border-b border-cda-border px-4 py-3 text-left hover:bg-cda-bg ${
              selecionado === c.id ? "bg-cda-bg" : ""
            }`}
          >
            {/* NOVO: bolinha de status online no avatar */}
            <div className="relative shrink-0">
              <Avatar nome={c.name} size="md" />
              {c.online && (
                <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-cda-green" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold text-cda-text">{c.name}</span>
                {/* NOVO: horário da última mensagem */}
                {c.ultimaEm && (
                  <span className="shrink-0 text-[11px] text-cda-text3">{formatarDataHora(c.ultimaEm).split(" ").pop()}</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs text-cda-text3">
                  {c.ultimaMensagem || (ROLE_LABEL[c.role] ?? c.role)}
                </p>
                {/* NOVO: selo sólido (não mais o Badge tintado) — bem mais visível */}
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

      <div className={`flex min-w-0 flex-1 flex-col ${selecionado ? "" : "hidden sm:flex"}`}>
        {!selecionado ? (
          <div className="flex flex-1 items-center justify-center text-sm text-cda-text3">
            Selecione um perfil pra conversar.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-cda-border px-4 py-3">
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
                    {/* NOVO: "Online" em verde no lugar do cargo, quando aplicável */}
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

            <div className="flex-1 overflow-y-auto bg-cda-bg px-4 py-4">
              <div className="mx-auto flex w-full max-w-2xl flex-col gap-3.5">
                {mensagens.map((m) => {
                  const minha = m.remetenteId === meId;
                  const nome = minha ? meNome : conversaAtual?.name ?? "";
                  return (
                    // NOVO: avatar + nome do remetente acima do balão (dos dois lados)
                    <div key={m.id} className={`flex items-end gap-2 ${minha ? "flex-row-reverse" : ""}`}>
                      <Avatar nome={nome} size="sm" />
                      <div className={`flex max-w-[70%] flex-col ${minha ? "items-end" : "items-start"}`}>
                        <span className="mb-0.5 text-[11px] font-semibold text-cda-text3">{nome}</span>
                        <div
                          className={`rounded-xl px-3 py-2 text-sm ${
                            minha ? "rounded-br-sm bg-cda-blue text-white" : "rounded-bl-sm bg-white text-cda-text"
                          }`}
                        >
                          {m.conteudo && <p className="whitespace-pre-wrap">{m.conteudo}</p>}
                          {m.anexo && (
                            <a
                              href={m.anexo}
                              download={m.anexoNome ?? "anexo"}
                              className={`mt-1 flex items-center gap-1.5 text-xs underline ${minha ? "text-white" : "text-cda-blue"}`}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              {m.anexoNome}
                            </a>
                          )}
                          <p className={`mt-1 text-[10px] ${minha ? "text-white/70" : "text-cda-text3"}`}>
                            {formatarDataHora(m.createdAt)}
                          </p>
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
                  {/* NOVO: anexo + input unificados numa pill só */}
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
                  {/* NOVO: botão de enviar circular */}
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
