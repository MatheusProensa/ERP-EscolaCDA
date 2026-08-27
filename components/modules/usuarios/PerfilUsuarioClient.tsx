"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, KeyRound, Copy, Check, History } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { showToast } from "@/components/ui/Toast";
import { formatarData, formatarDataHora } from "@/lib/utils";
import { ROLES_ATIVAS, ROLE_LABEL, ROLE_BADGE_VARIANT } from "@/lib/permissoes";

type Usuario = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string | Date;
  pedidoResetSenhaEm?: string | Date | null;
};

type LogItem = { id: string; acao: string; createdAt: string | Date };

export function PerfilUsuarioClient({
  usuario,
  souEu,
  podeVerAtividade,
  atividades,
}: {
  usuario: Usuario;
  souEu: boolean;
  podeVerAtividade: boolean;
  atividades: LogItem[];
}) {
  const router = useRouter();
  const [name, setName] = useState(usuario.name);
  const [email, setEmail] = useState(usuario.email);
  const [role, setRole] = useState(usuario.role);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState("");

  const [novaSenha, setNovaSenha] = useState<string | null>(null);
  const [escolhendoSenha, setEscolhendoSenha] = useState(false);
  const [senhaDigitada, setSenhaDigitada] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [redefinindo, setRedefinindo] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const sujo = name.trim() !== usuario.name || email.trim() !== usuario.email || role !== usuario.role;

  const perfilInvalido = useMemo(
    () => !ROLES_ATIVAS.includes(usuario.role as (typeof ROLES_ATIVAS)[number]),
    [usuario.role]
  );

  async function salvar() {
    setErroSalvar("");
    if (!name.trim()) {
      setErroSalvar("Nome não pode ficar em branco.");
      return;
    }
    setSalvando(true);
    const res = await fetch(`/api/usuarios/${usuario.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), role }),
    });
    setSalvando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErroSalvar(data.error ?? "Não foi possível salvar.");
      return;
    }
    showToast("Perfil atualizado.");
    router.refresh();
  }

  async function confirmarNovaSenha(senha: string) {
    setRedefinindo(true);
    setErroSenha("");
    const res = await fetch(`/api/usuarios/${usuario.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(senha ? { senha } : {}),
    });
    setRedefinindo(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErroSenha(data.error ?? "Não foi possível redefinir a senha.");
      return;
    }
    const data = await res.json();
    setEscolhendoSenha(false);
    setSenhaDigitada("");
    setNovaSenha(data.senha);
    showToast(`Nova senha definida para ${usuario.name}.`);
  }

  async function copiarSenha() {
    if (!novaSenha) return;
    await navigator.clipboard.writeText(novaSenha);
    setCopiado(true);
    showToast("Senha copiada para a área de transferência.", "info");
    setTimeout(() => setCopiado(false), 2000);
  }

  async function excluir() {
    if (!confirm(`Excluir o acesso de ${usuario.name}? Não tem como desfazer.`)) return;
    const res = await fetch(`/api/usuarios/${usuario.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Não foi possível excluir o usuário.");
      return;
    }
    router.push("/usuarios");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Avatar nome={usuario.name} size="xl" />
            <Badge variant={ROLE_BADGE_VARIANT[usuario.role] ?? "gray"}>
              {ROLE_LABEL[usuario.role] ?? usuario.role}
            </Badge>
            <span className="text-xs text-cda-text3">Desde {formatarData(usuario.createdAt)}</span>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Select label="Perfil de acesso" value={role} onChange={(e) => setRole(e.target.value)} disabled={souEu}>
              {perfilInvalido && <option value={usuario.role}>{ROLE_LABEL[usuario.role] ?? usuario.role}</option>}
              {ROLES_ATIVAS.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
            {souEu && (
              <p className="self-end text-xs text-cda-text3">Você não pode trocar seu próprio perfil de acesso.</p>
            )}

            {erroSalvar && <p className="sm:col-span-2 text-sm text-cda-red">{erroSalvar}</p>}

            <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
              <Button onClick={salvar} loading={salvando} disabled={!sujo}>
                Salvar alterações
              </Button>
              <button
                onClick={() => setEscolhendoSenha(true)}
                className="flex h-10 items-center gap-1.5 rounded-lg border border-cda-border bg-white px-4 text-sm font-medium text-cda-text hover:bg-cda-bg"
              >
                <KeyRound className="h-4 w-4" />
                Redefinir senha
              </button>
              {usuario.pedidoResetSenhaEm && <Badge variant="amber">Pediu redefinição</Badge>}
              <button
                onClick={excluir}
                disabled={souEu}
                title={souEu ? "Você não pode excluir seu próprio usuário" : "Excluir usuário"}
                className="ml-auto flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-cda-text3 hover:bg-cda-red/10 hover:text-cda-red disabled:pointer-events-none disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </button>
            </div>
          </div>
        </div>
      </Card>

      {podeVerAtividade && (
        <Card
          title={
            <span className="flex items-center gap-2">
              <History className="h-[15px] w-[15px] text-cda-blue" />
              Atividade recente
            </span>
          }
        >
          <div className="flex flex-col divide-y divide-cda-border">
            {atividades.length === 0 && (
              <p className="px-5 py-6 text-center text-sm text-cda-text3">Nenhuma atividade registrada.</p>
            )}
            {atividades.map((log) => (
              <div key={log.id} className="px-5 py-2.5 text-sm">
                <p className="text-cda-text">{log.acao}</p>
                <p className="text-xs text-cda-text3">{formatarDataHora(log.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={escolhendoSenha} onClose={() => setEscolhendoSenha(false)} title="Redefinir senha">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cda-text2">
            Escolha a nova senha de <strong>{usuario.name}</strong>. A senha atual deixará de funcionar.
          </p>
          <Input
            label="Nova senha"
            value={senhaDigitada}
            onChange={(e) => setSenhaDigitada(e.target.value)}
            placeholder="mínimo 4 caracteres"
            autoFocus
          />
          {erroSenha && <p className="text-sm text-cda-red">{erroSenha}</p>}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setEscolhendoSenha(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="outline" onClick={() => confirmarNovaSenha("")} loading={redefinindo}>
              Gerar automática
            </Button>
            <Button
              onClick={() => confirmarNovaSenha(senhaDigitada)}
              loading={redefinindo}
              disabled={senhaDigitada.trim().length < 4}
            >
              Salvar senha
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!novaSenha} onClose={() => setNovaSenha(null)} title="Nova senha definida">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cda-text2">
            Compartilhe esta senha com <strong>{usuario.name}</strong> por um canal seguro (WhatsApp, presencial). Ela
            só aparece aqui uma vez.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-cda-border bg-cda-bg px-3 py-2.5">
            <code className="flex-1 font-mono text-base font-semibold text-cda-text">{novaSenha}</code>
            <button
              onClick={copiarSenha}
              aria-label="Copiar senha"
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
    </div>
  );
}
