"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wallet,
  GraduationCap,
  UserCog,
  Megaphone,
  Package,
  UtensilsCrossed,
  KeyRound,
  ShieldCheck,
  Cake,
  Clock,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { rotaPermitida } from "@/lib/permissoes";

type NavItem = { label: string; href: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Principal",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Pedagógico",
    items: [
      { label: "Alunos", href: "/alunos", icon: Users },
      { label: "Acadêmico", href: "/academico", icon: GraduationCap },
      { label: "Mural", href: "/mural", icon: Megaphone },
      { label: "Cardápio", href: "/cardapio", icon: UtensilsCrossed },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { label: "Financeiro", href: "/financeiro", icon: Wallet },
      { label: "Ponto", href: "/ponto", icon: Clock },
    ],
  },
  {
    label: "Administrativo",
    items: [
      { label: "Funcionários", href: "/funcionarios", icon: UserCog },
      { label: "Estoque", href: "/estoque", icon: Package },
      { label: "Chaves", href: "/chaves", icon: KeyRound },
    ],
  },
  {
    label: "Escola",
    items: [{ label: "Aniversariantes", href: "/aniversariantes", icon: Cake }],
  },
  {
    label: "Sistema",
    items: [{ label: "Usuários", href: "/usuarios", icon: ShieldCheck }],
  },
];

export function Sidebar({ role, open, onClose }: { role: string; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const grupos = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => rotaPermitida(item.href, role)),
  })).filter((group) => group.items.length > 0);

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
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold tracking-tight text-white">CDA</span>
            <span className="rounded-full bg-cda-yellow px-2 py-0.5 text-[10px] font-bold text-cda-navy">
              ERP
            </span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {grupos.map((group) => (
            <div key={group.label} className="mb-5">
              <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-white/35">
                {group.label}
              </div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-cda-blue text-white"
                          : "text-white/65 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
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
