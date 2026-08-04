"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Send, FileText, ArrowLeft, Search, Check, CheckCheck, Pencil, Trash2, X as XIcon, Users } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { FileUpload } from "@/components/ui/FileUpload";
import { EmojiPicker } from "@/components/modules/chat/EmojiPicker";
import { CriarGrupoModal } from "@/components/modules/chat/CriarGrupoModal";
import { ROLE_LABEL } from "@/lib/permissoes";
import { formatarDataHora } from "@/lib/utils";

type ConversaDireta = {
  id: string;
  name: string;
  role: string;
  ultimaMensagem: string | null;
  ultimaEm: string | null;
  naoLidas: number;
  online?: boolean;
};

type GrupoResumo = {
  id: string;
  nome: string;
  tipo: "GRUPO" | "SETOR";
  participantesCount: number;
  ultimaMensagem: string | null;
  ultimaEm: string | null;
  naoLidas: number;
};

/** Item unificado da lista lateral — pode ser uma conversa direta (1:1) ou um
 * grupo/canal de setor. `key` carrega o prefixo ("u:"/"g:") usado pra rotear
 * cada ação (buscar mensagens, enviar, editar) pro endpoint certo. */
type ItemConversa = {
  key: string;
  id: string;
  tipo: "direto" | "grupo" | "setor";
  nome: string;
  role?: string;
  participantesCount?: number;
  ultimaMensagem: string | null;
  ultimaEm: string | null;
  naoLidas: number;
  online?: boolean;
};

function combinarLista(diretos: ConversaDireta[], grupos: GrupoResumo[]): ItemConversa[] {
  const itensGrupo: ItemConversa[] = grupos.map((g) => ({
    key: `g:${g.id}`,
    id: g.id,
    tipo: g.tipo === "SETOR" ? "setor" : "grupo",
    nome: g.nome,
    participantesCount: g.participantesCount,
    ultimaMensagem: g.ultimaMensagem,
    ultimaEm: g.ultimaEm,
    naoLidas: g.naoLidas,
  }));
  const itensDireto: ItemConversa[] = diretos.map((c) => ({
    key: `u:${c.id}`,
    id: c.id,
    tipo: "direto",
    nome: c.name,
    role: c.role,
    ultimaMensagem: c.ultimaMensagem,
    ultimaEm: c.ultimaEm,
    naoLidas: c.naoLidas,
    online: c.online,
  }));
  // Sort estável: quem tem mensagem mais recente sobe; sem nenhuma mensagem ainda,
  // mantém grupos/canais antes dos contatos diretos (ordem de chegada nos arrays).
  return [...itensGrupo, ...itensDireto].sort((a, b) => {
    if (!a.ultimaEm && !b.ultimaEm) return 0;
    if (!a.ultimaEm) return 1;
    if (!b.ultimaEm) return -1;
    return new Date(b.ultimaEm).getTime() - new Date(a.ultimaEm).getTime();
  });
}

type Mensagem = {
  id: string;
  remetenteId: string;
  /** Só presente em mensagens de grupo/setor — em conversa direta o nome vem de
   * `conversaAtual.nome` (o outro usuário) ou `meNome` (mensagem própria). */
  remetenteNome?: string;
  conteudo: string | null;
  anexo: string | null;
  anexoNome: string | null;
  createdAt: string;
  /** Só existe em conversa direta — grupo não tem recibo de leitura por mensagem. */
  lida?: boolean;
  excluida: boolean;
  editadaEm: string | null;
};

type MensagemDiretoBruta = {
  id: string;
  remetenteId: string;
  destinatarioId: string;
  conteudo: string | null;
  anexo: string | null;
  anexoNome: string | null;
  lida: boolean;
  excluida: boolean;
  editadaEm: string | null;
  createdAt: string;
};

type MensagemGrupoBruta = {
  id: string;
  remetenteId: string;
  remetente: { id: string; name: string };
  conteudo: string | null;
  anexo: string | null;
  anexoNome: string | null;
  excluida: boolean;
  editadaEm: string | null;
  createdAt: string;
};

function ehMensagemGrupo(m: MensagemDiretoBruta | MensagemGrupoBruta): m is MensagemGrupoBruta {
  return "remetente" in m;
}

function normalizarMensagem(m: MensagemDiretoBruta | MensagemGrupoBruta): Mensagem {
  if (ehMensagemGrupo(m)) {
    return {
      id: m.id,
      remetenteId: m.remetenteId,
      remetenteNome: m.remetente?.name,
      conteudo: m.conteudo,
      anexo: m.anexo,
      anexoNome: m.anexoNome,
      createdAt: m.createdAt,
      excluida: m.excluida,
      editadaEm: m.editadaEm,
    };
  }
  return {
    id: m.id,
    remetenteId: m.remetenteId,
    conteudo: m.conteudo,
    anexo: m.anexo,
    anexoNome: m.anexoNome,
    lida: m.lida,
    createdAt: m.createdAt,
    excluida: m.excluida,
    editadaEm: m.editadaEm,
  };
}

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

/** Monta a URL de mensagens certa a partir da key ("u:<id>" ou "g:<id>"). */
function urlMensagens(key: string): string {
  const [tipo, id] = key.split(":");
  return tipo === "u" ? `/api/chat/${id}` : `/api/grupos/${id}/mensagens`;
}

function urlMensagemAcao(key: string, msgId: string): string {
  const [tipo] = key.split(":");
  return tipo === "u" ? `/api/chat/mensagem/${msgId}` : `/api/grupos/mensagem/${msgId}`;
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
  conversasIniciais?: ConversaDireta[];
}) {
  const [diretos, setDiretos] = useState<ConversaDireta[]>(conversasIniciais ?? []);
  const [grupos, setGrupos] = useState<GrupoResumo[]>([]);
  const [carregandoConversas, setCarregandoConversas] = useState(!conversasIniciais);
  const [erroConversas, setErroConversas] = useState(false);
  const [buscaConversa, setBuscaConversa] = useState("");
  const [selecionado, setSelecionado] = useState<string | null>(selecionadoInicial ?? null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [temMaisAntigas, setTemMaisAntigas] = useState(false);
  const [carregandoAntigas, setCarregandoAntigas] = useState(false);
  const [erroMensagens, setErroMensagens] = useState(false);
  const [texto, setTexto] = useState("");
  const [anexo, setAnexo] = useState<{ dados: string; nome: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [editandoMsgId, setEditandoMsgId] = useState<string | null>(null);
  const [textoEdicao, setTextoEdicao] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);
  const ultimaMensagemEmRef = useRef<string | null>(null);
  const buscandoConversasRef = useRef(false);
  const buscandoMensagensRef = useRef(false);
  /** Id da conversa a que `mensagens` pertence de fato — evita mostrar mensagens
   * da conversa anterior por baixo do cabeçalho da conversa nova recém-clicada. */
  const [mensagensDeId, setMensagensDeId] = useState<string | null>(null);
  /** Incrementar força o efeito de carregar mensagens a rodar de novo mesmo com o
   * mesmo `selecionado` — usado pelo botão "Tentar de novo" após falha de rede. */
  const [tentativa, setTentativa] = useState(0);

  // O servidor só precisa "garantir" que o usuário está nos canais de setor uma
  // vez por sessão — repetir isso a cada poll de 15s significava 2 upserts no
  // banco sem necessidade nenhuma no caminho mais quente do chat.
  const primeiraChamadaGruposRef = useRef(true);

  useEffect(() => {
    let cancelado = false;
    async function carregarConversas() {
      // Evita empilhar requisições se uma anterior ainda não voltou (ex.: rede lenta).
      if (document.hidden || buscandoConversasRef.current) return;
      buscandoConversasRef.current = true;
      try {
        const urlGrupos = primeiraChamadaGruposRef.current ? "/api/grupos?garantir=1" : "/api/grupos";
        primeiraChamadaGruposRef.current = false;
        const [resDiretos, resGrupos] = await Promise.all([fetch("/api/chat"), fetch(urlGrupos)]);
        if (!resDiretos.ok || !resGrupos.ok) throw new Error("resposta não-ok");
        const [dadosDiretos, dadosGrupos] = await Promise.all([resDiretos.json(), resGrupos.json()]);
        if (cancelado) return;
        setDiretos(dadosDiretos);
        setGrupos(dadosGrupos);
        setErroConversas(false);
      } catch {
        if (!cancelado) setErroConversas(true);
      } finally {
        buscandoConversasRef.current = false;
        if (!cancelado) setCarregandoConversas(false);
      }
    }
    carregarConversas();
    const intervalo = setInterval(carregarConversas, 15000);
    // Volta da aba minimizada/outra aba → busca na hora em vez de esperar o próximo
    // tick do intervalo (podem ser quase 15s de espera pra ver algo que já mudou).
    function aoFicarVisivel() {
      if (!document.hidden) carregarConversas();
    }
    document.addEventListener("visibilitychange", aoFicarVisivel);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoFicarVisivel);
    };
  }, []);

  useEffect(() => {
    if (!selecionado) return;
    let cancelado = false;
    ultimaMensagemEmRef.current = null;
    // erroMensagens/temMaisAntigas não precisam resetar aqui: enquanto o fetch da
    // conversa nova não volta, "trocandoConversa" já esconde os dois na tela, e
    // carregarMensagens(false) abaixo define o valor certo assim que responde.
    const chaveConversa = selecionado;
    const base = urlMensagens(chaveConversa);

    async function carregarMensagens(incremental: boolean) {
      if (incremental && (document.hidden || buscandoMensagensRef.current)) return;
      buscandoMensagensRef.current = true;
      try {
        const desde = incremental && ultimaMensagemEmRef.current ? `?desde=${encodeURIComponent(ultimaMensagemEmRef.current)}` : "";
        const res = await fetch(`${base}${desde}`);
        if (!res.ok) throw new Error("resposta não-ok");
        if (cancelado) return;
        // "temMais" só é preenchido pela API na paginação pra cima (antes=), não aqui.
        const { mensagens: brutas }: { mensagens: (MensagemDiretoBruta | MensagemGrupoBruta)[] } = await res.json();
        const novas = brutas.map(normalizarMensagem);

        if (!incremental) {
          // Troca de conversa: só substitui quando os dados novos chegam — mantém as
          // mensagens antigas na tela até lá, em vez de piscar pra uma lista vazia.
          if (novas.length > 0) ultimaMensagemEmRef.current = novas[novas.length - 1].createdAt;
          setMensagensDeId(chaveConversa);
          setMensagens(novas);
          setTemMaisAntigas(novas.length >= 50);
          setErroMensagens(false);
          return;
        }

        setErroMensagens(false);
        if (novas.length === 0) return;
        ultimaMensagemEmRef.current = novas[novas.length - 1].createdAt;
        setMensagens((atual) => mesclarMensagens(atual, novas));
      } catch {
        // Só mostra erro pra carga inicial — falha num poll incremental de fundo
        // não precisa assustar quem já está vendo o histórico certinho na tela.
        if (!cancelado && !incremental) setErroMensagens(true);
      } finally {
        buscandoMensagensRef.current = false;
      }
    }

    carregarMensagens(false);
    const intervalo = setInterval(() => carregarMensagens(true), 4000);
    function aoFicarVisivel() {
      if (!document.hidden) carregarMensagens(true);
    }
    document.addEventListener("visibilitychange", aoFicarVisivel);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoFicarVisivel);
    };
  }, [selecionado, tentativa]);

  async function carregarMaisAntigas() {
    if (!selecionado || mensagens.length === 0 || carregandoAntigas) return;
    setCarregandoAntigas(true);
    try {
      const maisAntiga = mensagens[0].createdAt;
      const res = await fetch(`${urlMensagens(selecionado)}?antes=${encodeURIComponent(maisAntiga)}`);
      if (!res.ok) throw new Error("resposta não-ok");
      const {
        mensagens: antigasBrutas,
        temMais,
      }: { mensagens: (MensagemDiretoBruta | MensagemGrupoBruta)[]; temMais?: boolean } = await res.json();
      setMensagens((atual) => mesclarMensagens(antigasBrutas.map(normalizarMensagem), atual));
      setTemMaisAntigas(!!temMais);
    } catch {
      // silencioso — o botão continua ali pra tentar de novo
    } finally {
      setCarregandoAntigas(false);
    }
  }

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end" });
  }, [mensagens]);

  function selecionar(key: string) {
    setSelecionado(key);
    // Atualiza a URL sem navegação do Next (evita re-render do Server Component
    // e um novo round-trip de listarConversas a cada troca de conversa — o
    // ChatApp já é autossuficiente e gerencia os dados via polling próprio).
    const [tipo, id] = key.split(":");
    window.history.replaceState(null, "", tipo === "u" ? `/chat/${id}` : `/chat/g/${id}`);
  }

  async function aposGrupoCriado(grupo: { id: string; nome: string; tipo: "GRUPO" }) {
    try {
      const res = await fetch("/api/grupos");
      if (res.ok) setGrupos(await res.json());
    } catch {
      // silencioso — a lista de grupos atualiza sozinha no próximo poll
    }
    selecionar(`g:${grupo.id}`);
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!selecionado || (!texto.trim() && !anexo) || enviando) return;

    setEnviando(true);
    const res = await fetch(urlMensagens(selecionado), {
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
      const bruta: MensagemDiretoBruta | MensagemGrupoBruta = await res.json();
      const nova = normalizarMensagem(bruta);
      // Avança o cursor de polling pra essa mensagem já entrar como "vista" —
      // sem isso, o próximo poll buscava "tudo desde X" (X ainda apontando
      // pra antes dela) e a mesma mensagem voltava duplicada.
      ultimaMensagemEmRef.current = nova.createdAt;
      setMensagens((atual) => mesclarMensagens(atual, [nova]));
      setTexto("");
      setAnexo(null);
    }
  }

  function iniciarEdicao(m: Mensagem) {
    setEditandoMsgId(m.id);
    setTextoEdicao(m.conteudo ?? "");
  }

  async function salvarEdicao() {
    if (!editandoMsgId || !textoEdicao.trim() || !selecionado) return;
    setSalvandoEdicao(true);
    const res = await fetch(urlMensagemAcao(selecionado, editandoMsgId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conteudo: textoEdicao.trim() }),
    });
    setSalvandoEdicao(false);
    if (res.ok) {
      const atualizada = normalizarMensagem(await res.json());
      setMensagens((atual) => atual.map((m) => (m.id === atualizada.id ? atualizada : m)));
      setEditandoMsgId(null);
      setTextoEdicao("");
    }
  }

  async function excluirMensagem(id: string) {
    if (!selecionado) return;
    if (!confirm('Apagar esta mensagem? Vira "Mensagem apagada" pros outros também.')) return;
    const res = await fetch(urlMensagemAcao(selecionado, id), { method: "DELETE" });
    if (res.ok) {
      const atualizada = normalizarMensagem(await res.json());
      setMensagens((atual) => atual.map((m) => (m.id === atualizada.id ? atualizada : m)));
    }
  }

  const itensLista = useMemo(() => combinarLista(diretos, grupos), [diretos, grupos]);
  const conversaAtual = itensLista.find((c) => c.key === selecionado);
  const itensFiltrados = useMemo(() => {
    const termo = buscaConversa.trim().toLowerCase();
    if (!termo) return itensLista;
    return itensLista.filter((c) => c.nome.toLowerCase().includes(termo));
  }, [itensLista, buscaConversa]);
  const itensConversa = useMemo(() => montarItens(mensagens), [mensagens]);
  const trocandoConversa = selecionado !== mensagensDeId;

  return (
    <div className="mt-2 flex min-h-0 flex-1 overflow-hidden rounded-[10px] border border-cda-border bg-cda-surface">
      <div className={`flex w-full shrink-0 flex-col border-r border-cda-border sm:w-72 ${selecionado ? "hidden sm:flex" : ""}`}>
        <div className="flex items-center gap-1.5 border-b border-cda-border p-2.5">
          <div className="relative flex-1">
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
          <CriarGrupoModal usuarios={diretos.map((d) => ({ id: d.id, name: d.name, role: d.role }))} onCriado={aposGrupoCriado} />
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
          {!carregandoConversas && erroConversas && itensLista.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-cda-red">
              Não foi possível carregar. Tentando de novo em instantes...
            </p>
          )}
          {!carregandoConversas && !erroConversas && itensLista.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-cda-text3">Nenhuma conversa disponível.</p>
          )}
          {!carregandoConversas && itensLista.length > 0 && itensFiltrados.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-cda-text3">Nenhuma conversa com esse nome.</p>
          )}
          {itensFiltrados.map((c) => (
            <button
              key={c.key}
              onClick={() => selecionar(c.key)}
              className={`flex w-full items-center gap-3 border-b border-cda-border px-4 py-3 text-left transition-colors hover:bg-cda-bg ${
                selecionado === c.key ? "bg-cda-bg" : ""
              }`}
            >
              <div className="relative shrink-0">
                {c.tipo === "direto" ? (
                  <Avatar nome={c.nome} size="md" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cda-blue/10 text-cda-blue">
                    <Users className="h-4 w-4" />
                  </div>
                )}
                {c.online && (
                  <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-cda-green" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`truncate text-sm ${c.naoLidas > 0 ? "font-bold text-cda-text" : "font-semibold text-cda-text"}`}>
                    {c.nome}
                  </span>
                  {c.ultimaEm && (
                    <span className="shrink-0 text-[11px] text-cda-text3">{formatarDataHora(c.ultimaEm).split(" ").pop()}</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-xs ${c.naoLidas > 0 ? "font-medium text-cda-text2" : "text-cda-text3"}`}>
                    {c.ultimaMensagem ||
                      (c.tipo === "direto"
                        ? ROLE_LABEL[c.role ?? ""] ?? c.role
                        : `${c.tipo === "setor" ? "Canal de setor" : "Grupo"} · ${c.participantesCount} participante(s)`)}
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
            Selecione uma conversa.
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
                    {conversaAtual.tipo === "direto" ? (
                      <Avatar nome={conversaAtual.nome} size="sm" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cda-blue/10 text-cda-blue">
                        <Users className="h-4 w-4" />
                      </div>
                    )}
                    {conversaAtual.online && (
                      <span className="absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border-2 border-white bg-cda-green" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-cda-text">{conversaAtual.nome}</p>
                    {conversaAtual.tipo === "direto" ? (
                      <p className={`flex items-center gap-1 text-xs ${conversaAtual.online ? "text-cda-green" : "text-cda-text3"}`}>
                        {conversaAtual.online && <span className="h-1.5 w-1.5 rounded-full bg-cda-green" />}
                        {conversaAtual.online ? "Online" : ROLE_LABEL[conversaAtual.role ?? ""] ?? conversaAtual.role}
                      </p>
                    ) : (
                      <p className="text-xs text-cda-text3">
                        {conversaAtual.tipo === "setor" ? "Canal de setor" : "Grupo"} · {conversaAtual.participantesCount} participante(s)
                      </p>
                    )}
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
                {erroMensagens && !trocandoConversa && (
                  <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-cda-red/10 px-3 py-2 text-xs text-cda-red">
                    Não foi possível carregar as mensagens.
                    <button onClick={() => setTentativa((t) => t + 1)} className="font-semibold underline">
                      Tentar de novo
                    </button>
                  </div>
                )}
                {!trocandoConversa && temMaisAntigas && (
                  <div className="mb-2 flex justify-center">
                    <button
                      onClick={carregarMaisAntigas}
                      disabled={carregandoAntigas}
                      className="text-xs font-medium text-cda-blue hover:underline disabled:opacity-50"
                    >
                      {carregandoAntigas ? "Carregando..." : "Carregar mensagens anteriores"}
                    </button>
                  </div>
                )}
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
                  const nome = minha ? meNome : conversaAtual?.tipo === "direto" ? conversaAtual?.nome ?? "" : m.remetenteNome ?? "";
                  const imagem = m.anexo?.startsWith("data:image") ?? false;
                  const editandoEssa = editandoMsgId === m.id;

                  return (
                    <div
                      key={item.key}
                      className={`group flex items-end gap-2 ${minha ? "flex-row-reverse" : ""} ${item.mostrarCabecalho ? "mt-2.5" : ""}`}
                    >
                      {item.mostrarCabecalho ? (
                        <Avatar nome={nome} size="sm" />
                      ) : (
                        <div className="w-7 shrink-0" />
                      )}
                      {minha && !m.excluida && !editandoEssa && (
                        <div className="mb-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => iniciarEdicao(m)}
                            title="Editar mensagem"
                            aria-label="Editar mensagem"
                            className="flex h-6 w-6 items-center justify-center rounded-full text-cda-text3 hover:bg-white hover:text-cda-blue"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => excluirMensagem(m.id)}
                            title="Apagar mensagem"
                            aria-label="Apagar mensagem"
                            className="flex h-6 w-6 items-center justify-center rounded-full text-cda-text3 hover:bg-white hover:text-cda-red"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      <div className={`flex max-w-[70%] flex-col ${minha ? "items-end" : "items-start"}`}>
                        {item.mostrarCabecalho && (
                          <span className="mb-0.5 text-[11px] font-semibold text-cda-text3">{nome}</span>
                        )}
                        {editandoEssa ? (
                          <div className="flex w-64 flex-col gap-1.5 rounded-xl border border-cda-blue bg-white p-2 shadow-sm">
                            <textarea
                              autoFocus
                              value={textoEdicao}
                              onChange={(e) => setTextoEdicao(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  salvarEdicao();
                                }
                                if (e.key === "Escape") setEditandoMsgId(null);
                              }}
                              rows={2}
                              className="resize-none border-none bg-transparent text-sm text-cda-text outline-none"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditandoMsgId(null)}
                                className="flex items-center gap-1 text-xs text-cda-text3 hover:text-cda-text"
                              >
                                <XIcon className="h-3 w-3" /> Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={salvarEdicao}
                                disabled={salvandoEdicao || !textoEdicao.trim()}
                                className="text-xs font-semibold text-cda-blue hover:underline disabled:opacity-50"
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`rounded-xl px-3 py-2 text-sm shadow-sm ${
                              m.excluida
                                ? "italic text-cda-text3 " + (minha ? "rounded-br-sm bg-white" : "rounded-bl-sm bg-white")
                                : minha
                                  ? "rounded-br-sm bg-cda-blue text-white"
                                  : "rounded-bl-sm bg-white text-cda-text"
                            }`}
                          >
                            {m.excluida ? (
                              <p>Mensagem apagada</p>
                            ) : (
                              <>
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
                              </>
                            )}
                            <div
                              className={`mt-1 flex items-center gap-1 text-[10px] ${
                                m.excluida ? "text-cda-text3" : minha ? "justify-end text-white/70" : "text-cda-text3"
                              }`}
                            >
                              {m.editadaEm && !m.excluida && <span className="italic">editado ·</span>}
                              {formatarDataHora(m.createdAt).split(" ").pop()}
                              {minha && !m.excluida && m.lida !== undefined && (m.lida ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                            </div>
                          </div>
                        )}
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
                    <EmojiPicker onSelect={(emoji) => setTexto((t) => t + emoji)} disabled={enviando} />
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
