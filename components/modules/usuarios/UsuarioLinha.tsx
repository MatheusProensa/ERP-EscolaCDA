"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, KeyRound, Copy, Check } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Select } from "@/components/ui/Select";
import { Tr, Td } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatarData } from "@/lib/utils";
import { ROLES_ATIVAS, ROLE_LABEL } from "@/lib/permissoes";

type Usuario = { id: string; name: string; email: string; role: string; createdAt: string | Date };

export function UsuarioLinha({ usuario, souEu }: { usuario: Usuario; souEu: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [novaSenha, setNovaSenha] = useState<string | null>(null);
  const [redefinindo, setRedefinindo] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function redefinirSenha() {
    if (!confirm(`Gerar uma nova senha para ${usuario.name}? A senha atual deixará de funcionar.`)) return;
    setRedefinindo(true);
    setError("");
    const res = await fetch(`/api/usuarios/${usuario.id}`, { method: "POST" });
    setRedefinindo(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível redefinir a senha.");
      return;
    }
    const data = await res.json();
    setNovaSenha(data.senha);
  }

  async function copiarSenha() {
    if (!novaSenha) return;
    await navigator.clipboard.writeText(novaSenha);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

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
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={redefinirSenha}
            disabled={redefinindo}
            className="rounded-lg p-1.5 text-cda-text3 hover:bg-cda-blue/10 hover:text-cda-blue disabled:pointer-events-none disabled:opacity-30"
            title="Redefinir senha"
          >
            <KeyRound className="h-4 w-4" />
          </button>
          <button
            onClick={excluir}
            disabled={souEu}
            className="rounded-lg p-1.5 text-cda-text3 hover:bg-cda-red/10 hover:text-cda-red disabled:pointer-events-none disabled:opacity-30"
            title={souEu ? "Você não pode excluir seu próprio usuário" : "Excluir"}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </Td>

      <Modal open={!!novaSenha} onClose={() => setNovaSenha(null)} title="Nova senha gerada">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cda-text2">
            Compartilhe esta senha com <strong>{usuario.name}</strong> por um canal seguro (WhatsApp, presencial). Ela só
            aparece aqui uma vez.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-cda-border bg-cda-bg px-3 py-2.5">
            <code className="flex-1 font-mono text-base font-semibold text-cda-text">{novaSenha}</code>
            <button
              onClick={copiarSenha}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-cda-text2 hover:bg-white hover:text-cda-blue"
              title="Copiar"
            >
              {copiado ? <Check className="h-4 w-4 text-cda-green" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setNovaSenha(null)}>Fechar</Button>
          </div>
        </div>
      </Modal>
    </Tr>
  );
}
