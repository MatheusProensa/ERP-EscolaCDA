"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Ban, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { MODULOS, type NivelPermissao } from "@/lib/permissoes";

type Nivel = NivelPermissao | "HERDAR";

// Só dá pra RESTRINGIR aqui — nunca liberar um setor além do que o Perfil de
// acesso já dá (senão essa tela vira um jeito de burlar o próprio perfil).
// Por isso não tem opção de "editar": quem já edita pelo perfil continua
// editando; essa tela só serve pra tirar acesso ou deixar só ver.
const NIVEIS: { valor: Nivel; label: string; icon: typeof Eye; cor: string }[] = [
  { valor: "HERDAR", label: "Padrão do perfil", icon: RotateCcw, cor: "text-cda-text3" },
  { valor: "VER", label: "Só visualizar", icon: Eye, cor: "text-cda-amber" },
  { valor: "NENHUM", label: "Sem acesso", icon: Ban, cor: "text-cda-red" },
];

export function PermissoesUsuarioSecao({
  usuarioId,
  usuarioNome,
  souEu,
  permissoesSalvas,
}: {
  usuarioId: string;
  usuarioNome: string;
  souEu: boolean;
  permissoesSalvas: Record<string, string>;
}) {
  const router = useRouter();
  const [valores, setValores] = useState<Record<string, Nivel>>(() =>
    Object.fromEntries(MODULOS.map((m) => [m.chave, (permissoesSalvas[m.chave] as Nivel) ?? "HERDAR"]))
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const sujo = useMemo(
    () => MODULOS.some((m) => valores[m.chave] !== ((permissoesSalvas[m.chave] as Nivel) ?? "HERDAR")),
    [valores, permissoesSalvas]
  );

  function definir(chave: string, nivel: Nivel) {
    setValores((atual) => ({ ...atual, [chave]: nivel }));
  }

  async function salvar() {
    setErro("");
    setSalvando(true);
    const res = await fetch(`/api/usuarios/${usuarioId}/permissoes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissoes: valores }),
    });
    setSalvando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível salvar as permissões.");
      return;
    }
    showToast(`Permissões de ${usuarioNome} atualizadas.`);
    router.refresh();
  }

  return (
    <Card
      title="Permissões por setor"
      action={
        <Button onClick={salvar} loading={salvando} disabled={!sujo} size="sm">
          Salvar permissões
        </Button>
      }
    >
      <p className="border-b border-cda-border px-5 py-3 text-sm text-cda-text2">
        Só serve pra <strong>restringir</strong>: tirar acesso de um setor que o perfil de <strong>{usuarioNome}</strong>{" "}
        normalmente liberaria. Não dá pra liberar um setor que o perfil dela não dá. Só vale a partir do próximo
        login dela no sistema.
      </p>
      <div className="flex flex-col divide-y divide-cda-border">
        {MODULOS.map((modulo) => (
          <div key={modulo.chave} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <span className="text-sm font-medium text-cda-text">{modulo.label}</span>
            <div className="flex flex-wrap gap-1.5">
              {NIVEIS.map(({ valor, label, icon: Icon, cor }) => {
                const ativo = valores[modulo.chave] === valor;
                const bloqueadoAutoUsuarios = souEu && modulo.chave === "usuarios" && valor !== "HERDAR";
                return (
                  <button
                    key={valor}
                    type="button"
                    disabled={bloqueadoAutoUsuarios}
                    onClick={() => definir(modulo.chave, valor)}
                    title={bloqueadoAutoUsuarios ? "Você não pode alterar sua própria permissão em Usuários" : label}
                    className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                      ativo ? "border-cda-blue bg-cda-blue/10 text-cda-blue" : "border-cda-border bg-white text-cda-text2 hover:bg-cda-bg"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${ativo ? "" : cor}`} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {erro && <p className="px-5 py-3 text-sm text-cda-red">{erro}</p>}
    </Card>
  );
}
