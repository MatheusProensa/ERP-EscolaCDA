"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  GraduationCap,
  UserCog,
  Megaphone,
  Package,
  UtensilsCrossed,
  KeyRound,
  ShieldCheck,
  Cake,
  UserPlus,
  Clock,
  FileText,
  CalendarDays,
  MessageCircle,
  Receipt,
  Barcode,
  History,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { podeVerModulo, type PermissoesPorModulo } from "@/lib/permissoes";
import { canalInbox } from "@/lib/chatCanais";
import { getSupabaseRealtimeClient } from "@/lib/supabaseRealtimeClient";

type NavItem = { label: string; href: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

// NOVO: de 7 grupos pra 4 — "Escola", "Direção" e "Sistema" só tinham 1 item cada,
// só bagunçavam o menu. Aniversariantes e Interessados foram pro Administrativo
// (Duda usa os dois no dia a dia, junto com Documentos e Usuários).
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Calendário", href: "/calendario", icon: CalendarDays },
      { label: "Mural", href: "/mural", icon: Megaphone },
      { label: "Chat", href: "/chat", icon: MessageCircle },
    ],
  },
  {
    label: "Pedagógico",
    items: [
      { label: "Acadêmico", href: "/academico", icon: GraduationCap },
      { label: "Cardápio", href: "/cardapio", icon: UtensilsCrossed },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { label: "Ponto", href: "/ponto", icon: Clock },
      { label: "Notas Fiscais", href: "/notas-fiscais", icon: Receipt },
      { label: "Boletos", href: "/boletos", icon: Barcode },
    ],
  },
  {
    label: "Administrativo",
    items: [
      { label: "Interessados", href: "/interessados", icon: UserPlus },
      { label: "Aniversariantes", href: "/aniversariantes", icon: Cake },
      { label: "Funcionários", href: "/funcionarios", icon: UserCog },
      { label: "Estoque", href: "/estoque", icon: Package },
      { label: "Chaves", href: "/chaves", icon: KeyRound },
      { label: "Documentos", href: "/documentos", icon: FileText },
      { label: "Usuários", href: "/usuarios", icon: ShieldCheck },
      { label: "Log de Atividades", href: "/log-atividades", icon: History },
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
  const grupos = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => podeVerModulo(item.href, role, permissoes)),
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
