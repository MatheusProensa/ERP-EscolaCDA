import Link from "next/link";
import { MessageCircle, Menu } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "./NotificationBell";

export function Topbar({
  name,
  role,
  foto,
  onMenuClick,
}: {
  name: string;
  role: string;
  foto?: string | null;
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
        {/* A barra de busca global foi removida daqui — não tinha nenhuma função (não
            filtrava nada), ficava só decorativa. */}
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Link
          href="/chat"
          aria-label="Chat"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-cda-text2 hover:bg-cda-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cda-blue/40"
        >
          <MessageCircle className="h-[18px] w-[18px]" />
        </Link>
        <NotificationBell />
        <div className="mx-1 hidden h-6 w-px bg-cda-border sm:block" />
        <UserMenu name={name} role={role} foto={foto} />
      </div>
    </header>
  );
}
