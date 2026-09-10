import Link from "next/link";
import { KeyRound, CalendarDays } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ROLE_LABEL, ROLE_BADGE_VARIANT, ROLE_COR_DOT } from "@/lib/permissoes";
import { formatarData } from "@/lib/utils";

export type UsuarioCardDados = {
  id: string;
  name: string;
  email: string;
  role: string;
  foto?: string | null;
  createdAt: string | Date;
  pedidoResetSenhaEm?: string | Date | null;
};

export function UsuarioCard({ usuario, souEu }: { usuario: UsuarioCardDados; souEu: boolean }) {
  const cor = ROLE_COR_DOT[usuario.role] ?? "var(--cda-text3)";
  return (
    <Link
      href={`/usuarios/${usuario.id}`}
      // Mesma receita "premium" do MetricCard (handoff de design): levanta
      // levemente no hover, sombra e borda acompanham a cor do cargo em vez
      // de um azul genérico — reforça o mesmo código de cores do anel do
      // avatar e do badge, em vez de mais uma cor solta na tela.
      className="group relative flex flex-col gap-3.5 rounded-[10px] border border-cda-border bg-cda-surface p-4 transition-[transform,border-color,box-shadow] duration-500 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-6px_var(--usuario-glow)]"
      style={{ ["--usuario-glow" as string]: `color-mix(in oklch, ${cor} 45%, transparent)` }}
    >
      {usuario.pedidoResetSenhaEm && (
        <span
          title="Pediu redefinição de senha"
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-cda-border bg-white text-cda-amber shadow-sm"
        >
          <KeyRound className="h-3.5 w-3.5" />
        </span>
      )}
      <div className="flex items-center gap-3.5">
        <div
          className="shrink-0 rounded-full p-0.5 transition-transform duration-500 ease-out group-hover:scale-105"
          style={{ boxShadow: `0 0 0 2px color-mix(in oklch, ${cor} 55%, transparent)` }}
        >
          <Avatar nome={usuario.name} foto={usuario.foto} size="lg" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-cda-text">
            {usuario.name}
            {souEu && <span className="ml-1.5 font-normal text-cda-text3">(você)</span>}
          </p>
          <p className="truncate text-xs text-cda-text3">{usuario.email}</p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-cda-border pt-3">
        <Badge variant={ROLE_BADGE_VARIANT[usuario.role] ?? "neutral"}>{ROLE_LABEL[usuario.role] ?? usuario.role}</Badge>
        <span className="flex items-center gap-1 text-xs text-cda-text3">
          <CalendarDays className="h-3 w-3" />
          {formatarData(usuario.createdAt)}
        </span>
      </div>
    </Link>
  );
}
