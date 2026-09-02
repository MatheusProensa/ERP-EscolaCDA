"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { Send, FileText, ArrowLeft, Search, Check, CheckCheck, Clock, AlertCircle, Pencil, Trash2, X as XIcon, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { FileUpload } from "@/components/ui/FileUpload";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { showToast } from "@/components/ui/Toast";
import { EmojiPicker } from "@/components/modules/chat/EmojiPicker";
import { ROLE_LABEL } from "@/lib/permissoes";
import { formatarDataHora } from "@/lib/utils";
import { canalConversaDireta, canalInbox } from "@/lib/chatCanais";
import { getSupabaseRealtimeClient } from "@/lib/supabaseRealtimeClient";

type Conversa = {
  id: string;
  name: string;
  role: string;
  foto: string | null;
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
  updatedAt: string;
  lida: boolean;
  excluida: boolean;
  editadaEm: string | null;
  /** Mensagem otimista: aparece na hora do clique, antes do servidor confirmar. */
  enviando?: boolean;
  falhouEnvio?: boolean;
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

/** Maior `updatedAt` entre uma lista de mensagens e (opcionalmente) um cursor
 * já conhecido — usado pra avançar o cursor do polling incremental sem nunca
 * voltar pra trás. */
function maiorUpdatedAt(mensagens: Mensagem[], cursorAtual?: string | null): string {
  let maior = cursorAtual ?? mensagens[0].updatedAt;
  for (const m of mensagens) {
    if (m.updatedAt > maior) maior = m.updatedAt;
  }
  return maior;
}

/** Mescla `novas` em `atual`: quem já existe (mesmo id) é atualizado no lugar —
 * é assim que "lida"/edição/exclusão aparecem sem esperar um reload completo,
 * já que o polling incremental busca por `updatedAt`, não só mensagem nova de
 * verdade. Quem não existe ainda entra no fim da lista. */
function mesclarMensagens(atual: Mensagem[], novas: Mensagem[]): Mensagem[] {
  if (novas.length === 0) return atual;
  const idsExistentes = new Set(atual.map((m) => m.id));
  const atualizado = atual.map((m) => novas.find((n) => n.id === m.id) ?? m);
  const inteiramenteNovas = novas.filter((n) => !idsExistentes.has(n.id));
  return inteiramenteNovas.length > 0 ? [...atualizado, ...inteiramenteNovas] : atualizado;
}

export function ChatApp({
  meId,
  meNome,
  meFoto,
  selecionadoInicial,
  conversasIniciais,
}: {
  meId: string;
  /** NOVO: precisa do nome de quem está logado pra rotular o próprio balão de mensagem. */
  meNome: string;
  meFoto?: string | null;
  selecionadoInicial?: string;
  conversasIniciais?: Conversa[];
}) {
  const [conversas, setConversas] = useState<Conversa[]>(conversasIniciais ?? []);
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
  const [editandoMsgId, setEditandoMsgId] = useState<string | null>(null);
  const [textoEdicao, setTextoEdicao] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [mensagemParaExcluir, setMensagemParaExcluir] = useState<string | null>(null);
  const [excluindoMensagem, setExcluindoMensagem] = useState(false);
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
  /** O Realtime (lib/chatCanais + lib/supabaseRealtimeClient) chama essas refs
   * pra forçar uma busca imediata assim que alguém avisa "mudou algo" — o
   * polling abaixo continua existindo como rede de segurança (Realtime fora
   * do ar, aba que perdeu a conexão, etc.), só não é mais a única forma de
   * saber que chegou mensagem nova. */
  const refetchConversasAgoraRef = useRef<() => void>(() => {});
  const refetchMensagensAgoraRef = useRef<() => void>(() => {});
  /** Cache em memória (só dura a sessão da aba) das últimas mensagens de cada
   * conversa já aberta — trocar de volta pra alguém que já foi visto antes
   * mostra na hora, sem tela em branco, enquanto busca a versão mais nova por
   * baixo dos panos. Também é preenchido no hover (prefetchConversa) pra
   * primeira abertura já ter algo pronto quando o clique chega. */
  const cacheMensagensRef = useRef<Map<string, { mensagens: Mensagem[]; cursor: string | null }>>(new Map());
  const prefetchandoRef = useRef<Set<string>>(new Set());

  function prefetchConversa(userId: string) {
    if (userId === selecionado) return;
    if (cacheMensagensRef.current.has(userId) || prefetchandoRef.current.has(userId)) return;
    prefetchandoRef.current.add(userId);
    fetch(`/api/chat/${userId}?previa=1`)
      .then((res) => (res.ok ? res.json() : null))
      .then((dados: { mensagens: Mensagem[] } | null) => {
        if (!dados) return;
        cacheMensagensRef.current.set(userId, {
          mensagens: dados.mensagens,
          cursor: dados.mensagens.length > 0 ? maiorUpdatedAt(dados.mensagens) : null,
        });
      })
      .catch(() => {})
      .finally(() => prefetchandoRef.current.delete(userId));
  }

  useEffect(() => {
    let cancelado = false;
    async function carregarConversas() {
      // Evita empilhar requisições se uma anterior ainda não voltou (ex.: rede lenta).
      if (document.hidden || buscandoConversasRef.current) return;
      buscandoConversasRef.current = true;
      try {
        const res = await fetch("/api/chat");
        if (!res.ok) throw new Error("resposta não-ok");
        const dados = await res.json();
        if (cancelado) return;
        setConversas(dados);
        setErroConversas(false);
        // São poucas conversas possíveis (perfis do sistema, não pessoas
        // soltas) — adianta buscar as mensagens de todas em segundo plano,
        // não só de quem passou o mouse em cima. Assim o clique quase sempre
        // acha o cache já quente, mesmo na primeira abertura da sessão.
        for (const c of dados as { id: string }[]) prefetchConversa(c.id);
      } catch {
        if (!cancelado) setErroConversas(true);
      } finally {
        buscandoConversasRef.current = false;
        if (!cancelado) setCarregandoConversas(false);
      }
    }
    refetchConversasAgoraRef.current = carregarConversas;
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
    const idConversa = selecionado;

    // Já vimos essa conversa nessa sessão (ou o hover em cima dela já
    // adiantou a busca)? Mostra o que já temos NA HORA — sem tela em branco —
    // e ainda assim busca a versão mais nova por baixo, silenciosamente.
    const emCache = cacheMensagensRef.current.get(idConversa);
    if (emCache) {
      ultimaMensagemEmRef.current = emCache.cursor;
      setMensagensDeId(idConversa);
      setMensagens(emCache.mensagens);
      setTemMaisAntigas(emCache.mensagens.length >= 50);
      setErroMensagens(false);
    }

    async function carregarMensagens(incremental: boolean) {
      if (incremental && (document.hidden || buscandoMensagensRef.current)) return;
      buscandoMensagensRef.current = true;
      try {
        const desde = incremental && ultimaMensagemEmRef.current ? `?desde=${encodeURIComponent(ultimaMensagemEmRef.current)}` : "";
        const res = await fetch(`/api/chat/${idConversa}${desde}`);
        if (!res.ok) throw new Error("resposta não-ok");
        if (cancelado) return;
        // "temMais" só é preenchido pela API na paginação pra cima (antes=), não aqui.
        const { mensagens: novas }: { mensagens: Mensagem[] } = await res.json();

        if (!incremental) {
          // Troca de conversa: só substitui quando os dados novos chegam — mantém as
          // mensagens antigas na tela até lá, em vez de piscar pra uma lista vazia.
          if (novas.length > 0) ultimaMensagemEmRef.current = maiorUpdatedAt(novas);
          setMensagensDeId(idConversa);
          setMensagens(novas);
          setTemMaisAntigas(novas.length >= 50);
          setErroMensagens(false);
          // Guarda pra próxima vez que voltar nessa conversa na mesma sessão —
          // limita a 8 conversas em cache, derruba a mais antiga (Map preserva
          // ordem de inserção).
          cacheMensagensRef.current.delete(idConversa);
          cacheMensagensRef.current.set(idConversa, { mensagens: novas, cursor: ultimaMensagemEmRef.current });
          if (cacheMensagensRef.current.size > 8) {
            const maisAntiga = cacheMensagensRef.current.keys().next().value;
            if (maisAntiga) cacheMensagensRef.current.delete(maisAntiga);
          }
          return;
        }

        setErroMensagens(false);
        if (novas.length === 0) return;
        // Máximo entre as recebidas E o cursor atual — uma mensagem antiga que só
        // teve "lida" atualizada pode ter updatedAt menor que o que já tínhamos.
        ultimaMensagemEmRef.current = maiorUpdatedAt(novas, ultimaMensagemEmRef.current);
        setMensagens((atual) => {
          const mescladas = mesclarMensagens(atual, novas);
          const cache = cacheMensagensRef.current.get(idConversa);
          if (cache) cacheMensagensRef.current.set(idConversa, { mensagens: mescladas, cursor: ultimaMensagemEmRef.current });
          return mescladas;
        });
      } catch {
        // Só mostra erro pra carga inicial — falha num poll incremental de fundo
        // não precisa assustar quem já está vendo o histórico certinho na tela.
        if (!cancelado && !incremental) setErroMensagens(true);
      } finally {
        buscandoMensagensRef.current = false;
      }
    }

    refetchMensagensAgoraRef.current = () => carregarMensagens(true);
    carregarMensagens(false);
    // 2.5s em vez de 4s — banco e servidor agora estão na mesma região (Oregon),
    // então um poll a mais não pesa, e a mensagem do outro lado chega mais perto
    // de "na hora".
    const intervalo = setInterval(() => carregarMensagens(true), 2500);
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

  // Escuta o Realtime pra saber "chegou algo novo" sem esperar o próximo poll —
  // um canal fixo pra caixa de entrada (atualiza a lista lateral sempre) e um
  // por conversa aberta (atualiza as mensagens na hora). Se as variáveis do
  // Supabase Realtime não estiverem configuradas, getSupabaseRealtimeClient()
  // devolve null e isso tudo vira no-op — o polling comum continua cobrindo.
  useEffect(() => {
    const supabase = getSupabaseRealtimeClient();
    if (!supabase) return;
    const canal = supabase
      .channel(canalInbox(meId))
      .on("broadcast", { event: "atualizou" }, () => refetchConversasAgoraRef.current())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [meId]);

  useEffect(() => {
    if (!selecionado) return;
    const supabase = getSupabaseRealtimeClient();
    if (!supabase) return;
    const canal = supabase
      .channel(canalConversaDireta(meId, selecionado))
      .on("broadcast", { event: "atualizou" }, () => refetchMensagensAgoraRef.current())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [meId, selecionado]);

  async function carregarMaisAntigas() {
    if (!selecionado || mensagens.length === 0 || carregandoAntigas) return;
    setCarregandoAntigas(true);
    try {
      const maisAntiga = mensagens[0].createdAt;
      const res = await fetch(`/api/chat/${selecionado}?antes=${encodeURIComponent(maisAntiga)}`);
      if (!res.ok) throw new Error("resposta não-ok");
      const { mensagens: antigas, temMais }: { mensagens: Mensagem[]; temMais?: boolean } = await res.json();
      setMensagens((atual) => mesclarMensagens(antigas, atual));
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

  function selecionar(userId: string) {
    // ACHADO (depuração ao vivo, ago/2026): era isso que causava precisar clicar
    // 2x pra abrir/trocar de conversa. O clique em si sempre funcionou (confirmado
    // capturando os eventos reais do navegador) — o problema era o
    // window.history.replaceState logo abaixo: o Next.js intercepta QUALQUER
    // chamada de replaceState (não só a dele mesmo), e como essa rota é um
    // catch-all dinâmico (/chat/[[...userId]]), ele reagia disparando um
    // re-render que desfazia a seleção que acabou de ser aplicada — só o
    // clique seguinte "vencia" a corrida. Tirar a URL sincronizada resolve;
    // custo é só não atualizar a URL da aba ao trocar de conversa.
    flushSync(() => setSelecionado(userId));
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!selecionado || (!texto.trim() && !anexo)) return;

    const destinatario = selecionado;
    const conteudo = texto.trim() || null;
    const anexoEnviado = anexo;

    // Otimista: aparece no balão na hora do clique, sem esperar o servidor —
    // é a diferença entre "parece Facebook/WhatsApp" e "parece que travou".
    // Se der erro, essa mesma mensagem vira um "toque pra tentar de novo".
    const idTemporario = `tmp-${crypto.randomUUID()}`;
    const agora = new Date().toISOString();
    const mensagemOtimista: Mensagem = {
      id: idTemporario,
      remetenteId: meId,
      destinatarioId: destinatario,
      conteudo,
      anexo: anexoEnviado?.dados ?? null,
      anexoNome: anexoEnviado?.nome ?? null,
      createdAt: agora,
      updatedAt: agora,
      lida: false,
      excluida: false,
      editadaEm: null,
      enviando: true,
    };
    setMensagens((atual) => [...atual, mensagemOtimista]);
    setTexto("");
    setAnexo(null);

    const res = await fetch(`/api/chat/${destinatario}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conteudo, anexo: anexoEnviado?.dados ?? null, anexoNome: anexoEnviado?.nome ?? null }),
    });

    if (res.ok) {
      const nova = await res.json();
      // Avança o cursor de polling pra essa mensagem já entrar como "vista" —
      // sem isso, o próximo poll buscava "tudo desde X" (X ainda apontando
      // pra antes dela) e a mesma mensagem voltava duplicada.
      ultimaMensagemEmRef.current = nova.updatedAt;
      setMensagens((atual) => atual.map((m) => (m.id === idTemporario ? nova : m)));
    } else {
      setMensagens((atual) => atual.map((m) => (m.id === idTemporario ? { ...m, enviando: false, falhouEnvio: true } : m)));
    }
  }

  async function reenviar(m: Mensagem) {
    if (!selecionado) return;
    setMensagens((atual) => atual.map((x) => (x.id === m.id ? { ...x, enviando: true, falhouEnvio: false } : x)));
    const res = await fetch(`/api/chat/${selecionado}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conteudo: m.conteudo, anexo: m.anexo, anexoNome: m.anexoNome }),
    });
    if (res.ok) {
      const nova = await res.json();
      ultimaMensagemEmRef.current = nova.updatedAt;
      setMensagens((atual) => atual.map((x) => (x.id === m.id ? nova : x)));
    } else {
      setMensagens((atual) => atual.map((x) => (x.id === m.id ? { ...x, enviando: false, falhouEnvio: true } : x)));
    }
  }

  function iniciarEdicao(m: Mensagem) {
    setEditandoMsgId(m.id);
    setTextoEdicao(m.conteudo ?? "");
  }

  async function salvarEdicao() {
    if (!editandoMsgId || !textoEdicao.trim()) return;
    setSalvandoEdicao(true);
    const res = await fetch(`/api/chat/mensagem/${editandoMsgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conteudo: textoEdicao.trim() }),
    });
    setSalvandoEdicao(false);
    if (res.ok) {
      const atualizada = await res.json();
      setMensagens((atual) => atual.map((m) => (m.id === atualizada.id ? atualizada : m)));
      setEditandoMsgId(null);
      setTextoEdicao("");
    }
  }

  async function excluirMensagem(id: string) {
    setExcluindoMensagem(true);
    try {
      const res = await fetch(`/api/chat/mensagem/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      const atualizada = await res.json();
      setMensagens((atual) => atual.map((m) => (m.id === atualizada.id ? atualizada : m)));
      setMensagemParaExcluir(null);
    } catch {
      showToast("Não foi possível apagar a mensagem.", "error");
    } finally {
      setExcluindoMensagem(false);
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
              onMouseEnter={() => prefetchConversa(c.id)}
              onTouchStart={() => prefetchConversa(c.id)}
              // touch-manipulation: dentro de uma lista com scroll, o celular às vezes
              // fica em dúvida se o toque é rolagem ou clique — sem isso, o primeiro
              // toque só "arma" a decisão e é descartado, precisando de um segundo
              // toque pra realmente abrir a conversa. Isso tira a ambiguidade.
              className={`flex w-full touch-manipulation items-center gap-3 border-b border-cda-border px-4 py-3 text-left transition-colors ${
                selecionado === c.id
                  ? "border-l-4 border-l-cda-blue bg-cda-blue/10"
                  : "border-l-4 border-l-transparent hover:bg-cda-bg"
              }`}
            >
              <div className="relative shrink-0">
                <Avatar nome={c.name} foto={c.foto} size="md" />
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
            <div key={selecionado} className="flex items-center gap-3 border-b border-cda-border bg-white px-4 py-3">
              <button onClick={() => setSelecionado(null)} className="text-cda-text2 hover:text-cda-text sm:hidden">
                <ArrowLeft className="h-4 w-4" />
              </button>
              {conversaAtual ? (
                <>
                  <div className="relative">
                    <Avatar nome={conversaAtual.name} foto={conversaAtual.foto} size="sm" />
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
              ) : null}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="mx-auto flex w-full max-w-2xl flex-col gap-0.5">
                {/* NOVO: antes ficava em branco, sem nenhum aviso, enquanto buscava as
                    mensagens da conversa recém-clicada — parecia que o clique não tinha
                    funcionado (alguém achava que precisava clicar de novo). */}
                {trocandoConversa && (
                  <div className="flex flex-1 items-center justify-center py-10 text-cda-text3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
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
                {!trocandoConversa &&
                  itensConversa.map((item) => {
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
                  const foto = minha ? meFoto : conversaAtual?.foto;
                  const imagem = m.anexo?.startsWith("data:image") ?? false;
                  const editandoEssa = editandoMsgId === m.id;

                  return (
                    <div
                      key={item.key}
                      // Com "flex-row-reverse", o eixo principal também inverte — "start" passa
                      // a ser a DIREITA da tela, não a esquerda. Por isso é "justify-start" aqui
                      // (testei ao vivo: "justify-end" empurrava pro lado errado, balão ficava
                      // solto no meio/esquerda com o avatar sozinho lá na direita).
                      className={`group flex items-end gap-2 ${minha ? "flex-row-reverse justify-start" : ""} ${item.mostrarCabecalho ? "mt-2.5" : ""}`}
                    >
                      {item.mostrarCabecalho ? (
                        <Avatar nome={nome} foto={foto} size="sm" />
                      ) : (
                        <div className="w-7 shrink-0" />
                      )}
                      {minha && !m.excluida && !editandoEssa && !m.enviando && !m.falhouEnvio && (
                        // ACHADO (medição ao vivo): "opacity-0" sozinho continua ocupando o
                        // espaço no layout mesmo escondido — era isso que empurrava o balão
                        // pra longe da borda direita (parecia "grudado no meio da tela"). Com
                        // "w-0 overflow-hidden" ele some de verdade em repouso e só ganha
                        // largura no hover.
                        <div className="mb-1 flex w-0 items-center gap-1 overflow-hidden opacity-0 transition-opacity group-hover:w-auto group-hover:opacity-100">
                          <IconButton icon={Pencil} label="Editar mensagem" size="sm" onClick={() => iniciarEdicao(m)} />
                          <IconButton icon={Trash2} label="Apagar mensagem" size="sm" variant="danger" onClick={() => setMensagemParaExcluir(m.id)} />
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
                            onClick={m.falhouEnvio ? () => reenviar(m) : undefined}
                            className={`rounded-xl px-3 py-2 text-sm shadow-sm ${m.falhouEnvio ? "cursor-pointer" : ""} ${
                              m.excluida
                                ? "italic text-cda-text3 " + (minha ? "rounded-br-sm bg-white" : "rounded-bl-sm bg-white")
                                : m.falhouEnvio
                                  ? "rounded-br-sm border border-cda-red bg-cda-red/10 text-cda-text"
                                  : minha
                                    ? `rounded-br-sm bg-cda-blue text-white ${m.enviando ? "opacity-60" : ""}`
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
                                m.excluida
                                  ? "text-cda-text3"
                                  : m.falhouEnvio
                                    ? "justify-end text-cda-red"
                                    : minha
                                      ? "justify-end text-white/70"
                                      : "text-cda-text3"
                              }`}
                            >
                              {m.falhouEnvio ? (
                                <>
                                  <AlertCircle className="h-3 w-3" /> Falha ao enviar · toque pra tentar de novo
                                </>
                              ) : (
                                <>
                                  {m.editadaEm && !m.excluida && <span className="italic">editado ·</span>}
                                  {formatarDataHora(m.createdAt).split(" ").pop()}
                                  {minha &&
                                    !m.excluida &&
                                    (m.enviando ? (
                                      <Clock className="h-3 w-3" />
                                    ) : m.lida ? (
                                      <CheckCheck className="h-3 w-3" />
                                    ) : (
                                      <Check className="h-3 w-3" />
                                    ))}
                                </>
                              )}
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
                  {/* min-w-0: sem isso, um <div> flex-1 não encolhe abaixo da largura
                      natural do conteúdo (botões + texto do input) — no celular isso
                      empurrava o botão de enviar pra fora da tela. */}
                  <div className="flex min-w-0 flex-1 items-center gap-1 rounded-full border border-cda-border bg-cda-bg px-1.5">
                    <FileUpload maxSizeMB={3} label="" onSelect={(dados, nome) => setAnexo({ dados, nome })} />
                    <EmojiPicker onSelect={(emoji) => setTexto((t) => t + emoji)} />
                    <input
                      type="text"
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      placeholder="Escreva uma mensagem..."
                      aria-label="Escreva uma mensagem"
                      className="h-9 min-w-0 flex-1 border-none bg-transparent px-1 text-sm text-cda-text outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!texto.trim() && !anexo}
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

      <ConfirmDialog
        open={mensagemParaExcluir !== null}
        onClose={() => setMensagemParaExcluir(null)}
        onConfirm={() => mensagemParaExcluir && excluirMensagem(mensagemParaExcluir)}
        title="Apagar esta mensagem?"
        consequence='Vira "Mensagem apagada" pro destinatário também.'
        confirmLabel="Apagar"
        loading={excluindoMensagem}
      />
    </div>
  );
}
