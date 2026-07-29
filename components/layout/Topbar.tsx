import Link from "next/link";
import { Search, HelpCircle, MessageCircle, Menu } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "./NotificationBell";

export function Topbar({
  name,
  role,
  onMenuClick,
}: {
  name: string;
  role: string;
  onMenuClick: () => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-cda-border bg-white px-3 shadow-sm sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          onClick={onMenuClick}
          aria-label="Abrir menu"
          // NOVO: 44px (h-11 w-11) em vez de 36px — alvo de toque mínimo recomendado,
          // relevante pra equipe que acessa pelo celular.
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-cda-text2 hover:bg-cda-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cda-blue/40 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cda-text3" />
          <input
            type="text"
            placeholder="Buscar..."
            aria-label="Buscar"
            className="h-9 w-full rounded-lg border border-cda-border bg-cda-bg pl-9 pr-3 text-sm text-cda-text placeholder:text-cda-text3 outline-none focus:border-cda-blue focus:bg-white"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button aria-label="Ajuda" className="hidden h-11 w-11 items-center justify-center rounded-lg text-cda-text2 hover:bg-cda-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cda-blue/40 sm:flex">
          <HelpCircle className="h-[18px] w-[18px]" />
        </button>
        <Link
          href="/chat"
          aria-label="Chat"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-cda-text2 hover:bg-cda-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cda-blue/40"
        >
          <MessageCircle className="h-[18px] w-[18px]" />
        </Link>
        <NotificationBell />
        <div className="mx-1 hidden h-6 w-px bg-cda-border sm:block" />
        <UserMenu name={name} role={role} />
      </div>
    </header>
  );
}
