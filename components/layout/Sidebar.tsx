"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  UserCog,
  Megaphone,
  Package,
  UtensilsCrossed,
  KeyRound,
  ShieldCheck,
  Cake,
  UserPlus,
  Clock,
  CalendarClock,
  FileText,
  CalendarDays,
  MessageCircle,
  Receipt,
  Barcode,
  History,
  Ruler,
  Printer,
  ChevronDown,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { podeVerModulo, type PermissoesPorModulo } from "@/lib/permissoes";
import { canalInbox } from "@/lib/chatCanais";
import { getSupabaseRealtimeClient } from "@/lib/supabaseRealtimeClient";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Restrição extra de Role, por CIMA da grade de permissões (achado real,
   * out/2026: "Geral" do Calendário só devia aparecer pra Admin/Direção,
   * mas todo mundo com Calendário na grade continua vendo "Pedagógico"). */
  roles?: string[];
  /** Vira item expansível com submenu — 1 filho visível some direto (achata
   * pro item único, sem grupo de 1 opção só). */
  children?: NavItem[];
};
type NavGroup = { label: string; items: NavItem[] };

// De 7 grupos pra 4 — "Escola" e "Direção" só tinham 1 item cada, só
// bagunçavam o menu, e "Pedagógico" também virou parte do Administrativo
// (Acadêmico e Cardápio no dia a dia são tarefa da secretaria, junto com
// Aniversariantes, Interessados e Documentos). Dentro de cada grupo, ordem
// alfabética — com vários itens em Administrativo, ficou mais fácil de
// escanear por posição do que por frequência de uso. "Dashboard" é a única
// exceção, sempre primeiro no Principal (é a home, não faz sentido ordenar
// ele no meio da lista).
// "Pedagógico" voltou a existir (out/2026, task #18) — mas agora é diferente
// do que foi dobrado antes: não duplica o Acadêmico, é a área pessoal da
// professora (parecer/planejamento/portfólio, escopada pela turma/matéria
// dela). Grupo de 1 item de novo, mas dessa vez de propósito — essa página
// só cresce por dentro (novas seções internas), não vira mais itens de menu.
// "Sistema" separado do Administrativo (set/2026, pedido do dono): Usuários
// e Log de Atividades são administração do PRÓPRIO ERP (quem acessa o quê,
// auditoria de mudanças), não tarefa do dia a dia da secretaria — misturado
// junto de Acadêmico/Cardápio/Estoque ficava difícil de achar.
// "Nutrição" separado do Administrativo (set/2026, pedido do dono): Cardápio
// e Avaliação Nutricional são a área da nutricionista, não da secretaria —
// vieram juntos pra não reintroduzir grupo de 1 item só (motivo da limpeza
// de 7→4 grupos, comentário acima).
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      {
        label: "Calendário",
        href: "/calendario",
        icon: CalendarDays,
        // "Geral" (pedido do dono, out/2026): só Admin/Direção — o resto de
        // quem enxerga Calendário na grade continua vendo só "Pedagógico".
        children: [
          { label: "Geral", href: "/calendario", icon: CalendarDays, roles: ["ADMIN", "DIRECAO"] },
          { label: "Pedagógico", href: "/calendario/pedagogico", icon: CalendarDays },
        ],
      },
      { label: "Chat", href: "/chat", icon: MessageCircle },
      { label: "Mural", href: "/mural", icon: Megaphone },
    ],
  },
  {
    label: "Administrativo",
    items: [
      { label: "Acadêmico", href: "/academico", icon: GraduationCap },
      { label: "Aniversariantes", href: "/aniversariantes", icon: Cake },
      { label: "Chaves", href: "/chaves", icon: KeyRound },
      { label: "Documentos", href: "/documentos", icon: FileText },
      { label: "Estoque", href: "/estoque", icon: Package },
      { label: "Fila de Impressão", href: "/impressao", icon: Printer },
      { label: "Funcionários", href: "/funcionarios", icon: UserCog },
      { label: "Horários da Equipe", href: "/horarios-equipe", icon: CalendarClock },
      { label: "Interessados", href: "/interessados", icon: UserPlus },
    ],
  },
  {
    label: "Pedagógico",
    items: [{ label: "Minhas Turmas", href: "/pedagogico", icon: BookOpen }],
  },
  {
    label: "Nutrição",
    items: [
      { label: "Avaliação Nutricional", href: "/avaliacao-nutricional", icon: Ruler },
      { label: "Cardápio", href: "/cardapio", icon: UtensilsCrossed },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { label: "Boletos", href: "/boletos", icon: Barcode },
      { label: "Notas Fiscais", href: "/notas-fiscais", icon: Receipt },
      { label: "Ponto", href: "/ponto", icon: Clock },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Log de Atividades", href: "/log-atividades", icon: History },
      { label: "Usuários", href: "/usuarios", icon: ShieldCheck },
    ],
  },
];

export function Sidebar({
  meId,
  role,
  permissoes,
  open,
  onClose,
}: {
  meId: string;
  role: string;
  permissoes?: PermissoesPorModulo;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);
  const [submenusAbertos, setSubmenusAbertos] = useState<Set<string>>(new Set());

  // Item com children: filtra os filhos pela grade + roles extra; 1 filho
  // visível só (achado real: professora sem Admin/Direção só vê
  // "Pedagógico") vira link direto, sem grupo de 1 opção só.
  function filtrarItem(item: NavItem): NavItem | null {
    if (item.children) {
      const filhosVisiveis = item.children
        .filter((c) => podeVerModulo(c.href, role, permissoes))
        .filter((c) => !c.roles || c.roles.includes(role));
      if (filhosVisiveis.length === 0) return null;
      if (filhosVisiveis.length === 1) return filhosVisiveis[0];
      return { ...item, children: filhosVisiveis };
    }
    return podeVerModulo(item.href, role, permissoes) ? item : null;
  }

  const grupos = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.map(filtrarItem).filter((item): item is NavItem => item !== null),
  })).filter((group) => group.items.length > 0);

  useEffect(() => {
    let cancelado = false;
    async function verificar() {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/chat/nao-lidas");
        if (!res.ok || cancelado) return;
        const { total } = await res.json();
        if (!cancelado) setMensagensNaoLidas(total);
      } catch {
        // silencioso — não é crítico, tenta de novo no próximo intervalo
      }
    }
    verificar();
    const intervalo = setInterval(verificar, 20000);

    // Realtime: assim que chega mensagem em qualquer conversa, o badge atualiza
    // na hora, em qualquer tela do sistema — não só dentro do Chat.
    const supabase = getSupabaseRealtimeClient();
    const canal = supabase
      ?.channel(canalInbox(meId))
      .on("broadcast", { event: "atualizou" }, verificar)
      .subscribe();

    return () => {
      cancelado = true;
      clearInterval(intervalo);
      if (supabase && canal) supabase.removeChannel(canal);
    };
  }, [pathname, meId]);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-full w-[216px] shrink-0 flex-col bg-cda-navy transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="relative flex items-center justify-center gap-2 px-5 py-5">
          {/* Logo de verdade em vez do texto "CDA" solto + badge "ERP" — não
              era fiel ao logo real da escola. Usa o logo-cda.png (não o
              "semborda") porque esse tem bastante espaço vazio ao redor —
              numa altura pequena a marca em si ficava minúscula. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-cda.png" alt="Escola CDA" className="h-9 w-auto" />
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="absolute right-5 text-white/60 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* NOVO: data-cda-scroll="dark" pega a barra de rolagem clara definida em globals.css */}
        <nav data-cda-scroll="dark" className="flex-1 overflow-y-auto px-3 pb-4">
          {grupos.map((group) => (
            <div key={group.label} className="mb-5">
              <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-white/35">
                {group.label}
              </div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  if (item.children) {
                    const filhoAtivo = item.children.some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`));
                    const aberto = submenusAbertos.has(item.label) || filhoAtivo;
                    const Icon = item.icon;
                    return (
                      <div key={item.label}>
                        <button
                          type="button"
                          onClick={() =>
                            setSubmenusAbertos((atual) => {
                              const novo = new Set(atual);
                              if (novo.has(item.label)) novo.delete(item.label);
                              else novo.add(item.label);
                              return novo;
                            })
                          }
                          aria-expanded={aberto}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-white/65 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50"
                        >
                          <Icon className="h-4 w-4" />
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", aberto && "rotate-180")} />
                        </button>
                        {aberto && (
                          <div className="ml-4 flex flex-col gap-0.5 border-l border-white/10 py-0.5 pl-3">
                            {item.children.map((child) => {
                              const active = pathname === child.href || pathname.startsWith(`${child.href}/`);
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  onClick={onClose}
                                  aria-current={active ? "page" : undefined}
                                  className={cn(
                                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50",
                                    active ? "bg-cda-blue text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
                                  )}
                                >
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  const naoLidas = item.href === "/chat" ? mensagensNaoLidas : 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50",
                        active
                          ? "bg-cda-blue text-white"
                          : "text-white/65 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{item.label}</span>
                      {naoLidas > 0 && (
                        <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-cda-red px-1 text-[11px] font-bold text-white">
                          {naoLidas}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
