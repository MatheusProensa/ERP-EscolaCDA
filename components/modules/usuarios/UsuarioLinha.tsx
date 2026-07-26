"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Select } from "@/components/ui/Select";
import { Tr, Td } from "@/components/ui/Table";
import { formatarData } from "@/lib/utils";
import { ROLES_ATIVAS, ROLE_LABEL } from "@/lib/permissoes";

type Usuario = { id: string; name: string; email: string; role: string; createdAt: string | Date };

export function UsuarioLinha({ usuario, souEu }: { usuario: Usuario; souEu: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function trocarPerfil(role: string) {
    setError("");
    setLoading(true);
    const res = await fetch(`/api/usuarios/${usuario.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível alterar o perfil.");
      return;
    }
    router.refresh();
  }

  async function excluir() {
    if (!confirm(`Excluir o acesso de ${usuario.name}?`)) return;
    const res = await fetch(`/api/usuarios/${usuario.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível excluir o usuário.");
      return;
    }
    router.refresh();
  }

  return (
    <Tr>
      <Td>
        <div className="flex items-center gap-2.5">
          <Avatar nome={usuario.name} size="sm" />
          <div>
            <div className="font-medium">
              {usuario.name} {souEu && <span className="text-xs text-cda-text3">(você)</span>}
            </div>
            <div className="text-xs text-cda-text3">{usuario.email}</div>
          </div>
        </div>
      </Td>
      <Td>
        <Select
          value={usuario.role in ROLE_LABEL ? usuario.role : ""}
          onChange={(e) => trocarPerfil(e.target.value)}
          disabled={loading}
          className="h-8 w-40 text-xs"
        >
          {!ROLES_ATIVAS.includes(usuario.role as (typeof ROLES_ATIVAS)[number]) && (
            <option value="">{ROLE_LABEL[usuario.role] ?? usuario.role}</option>
          )}
          {ROLES_ATIVAS.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABEL[role]}
            </option>
          ))}
        </Select>
        {error && <p className="mt-1 text-xs text-cda-red">{error}</p>}
      </Td>
      <Td className="text-cda-text3">{formatarData(usuario.createdAt)}</Td>
      <Td className="text-right">
        <button
          onClick={excluir}
          disabled={souEu}
          className="rounded-lg p-1.5 text-cda-text3 hover:bg-cda-red/10 hover:text-cda-red disabled:pointer-events-none disabled:opacity-30"
          title={souEu ? "Você não pode excluir seu próprio usuário" : "Excluir"}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </Td>
    </Tr>
  );
}
