import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ROLE_LABEL, ROLE_BADGE_VARIANT } from "@/lib/permissoes";
import { formatarData } from "@/lib/utils";

export type UsuarioCardDados = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string | Date;
  pedidoResetSenhaEm?: string | Date | null;
};

export function UsuarioCard({ usuario, souEu }: { usuario: UsuarioCardDados; souEu: boolean }) {
  return (
    <Link
      href={`/usuarios/${usuario.id}`}
      className="group flex flex-col gap-3 rounded-[10px] border border-cda-border bg-cda-surface p-4 transition-colors hover:border-cda-blue/40 hover:bg-cda-blue/5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar nome={usuario.name} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-cda-text group-hover:text-cda-blue">
              {usuario.name}
              {souEu && <span className="ml-1.5 font-normal text-cda-text3">(você)</span>}
            </p>
            <p className="truncate text-xs text-cda-text3">{usuario.email}</p>
          </div>
        </div>
        {usuario.pedidoResetSenhaEm && (
          <span title="Pediu redefinição de senha" className="shrink-0 text-cda-amber">
            <KeyRound className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <Badge variant={ROLE_BADGE_VARIANT[usuario.role] ?? "gray"}>{ROLE_LABEL[usuario.role] ?? usuario.role}</Badge>
        <span className="text-xs text-cda-text3">desde {formatarData(usuario.createdAt)}</span>
      </div>
    </Link>
  );
}
