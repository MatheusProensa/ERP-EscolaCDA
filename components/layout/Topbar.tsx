import { Search, HelpCircle, Mail } from "lucide-react";
import { UserMenu } from "./UserMenu";

export function Topbar({ name, role }: { name: string; role: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-cda-border bg-white px-5 shadow-sm">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cda-text3" />
        <input
          type="text"
          placeholder="Buscar..."
          className="h-9 w-full rounded-lg border border-cda-border bg-cda-bg pl-9 pr-3 text-sm text-cda-text placeholder:text-cda-text3 outline-none focus:border-cda-blue focus:bg-white"
        />
      </div>

      <div className="flex items-center gap-2">
        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-cda-text2 hover:bg-cda-bg">
          <HelpCircle className="h-[18px] w-[18px]" />
        </button>
        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-cda-text2 hover:bg-cda-bg">
          <Mail className="h-[18px] w-[18px]" />
        </button>
        <div className="mx-1 h-6 w-px bg-cda-border" />
        <UserMenu name={name} role={role} />
      </div>
    </header>
  );
}
