"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Ban, RotateCcw, ShieldCheck, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { showToast } from "@/components/ui/Toast";
import { MODULOS, type NivelPermissao } from "@/lib/permissoes";

type Nivel = NivelPermissao | "HERDAR";

// Pedido explícito do dono do sistema: essa grade decide de verdade, pra
// qualquer setor — pode liberar algo que o Perfil de acesso da pessoa não
// daria por padrão, não só restringir. "Padrão do perfil" é a única opção
// que ainda depende do Perfil; as outras três valem por conta própria.
const NIVEIS: { valor: Nivel; label: string; icon: typeof Eye; cor: string }[] = [
  { valor: "HERDAR", label: "Padrão do perfil", icon: RotateCcw, cor: "text-cda-text3" },
  { valor: "EDITAR", label: "Ler e editar", icon: ShieldCheck, cor: "text-cda-green" },
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
  const personalizacoesAtivas = Object.values(permissoesSalvas).filter((v) => v !== "HERDAR").length;
  // Só abre sozinho se já tem algo configurado — quem nunca mexeu aqui não
  // precisa nem ver que essa opção existe.
  const [aberto, setAberto] = useState(personalizacoesAtivas > 0);

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
    <Card>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-cda-text">Acesso por setor (avançado)</h3>
          {personalizacoesAtivas > 0 && <Badge variant="amber">{personalizacoesAtivas} setor(es) personalizado(s)</Badge>}
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-cda-text3 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>

      {aberto && (
        <>
          <p className="border-y border-cda-border px-5 py-3 text-sm text-cda-text2">
            A maioria das pessoas não precisa mexer aqui — o <strong>Perfil de acesso</strong> lá em cima já libera o
            que cada uma pode ver. Use isto pra ajustar <strong>{usuarioNome}</strong> setor por setor, liberando ou
            tirando acesso, sem depender do Perfil dela.
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
          <div className="flex justify-end border-t border-cda-border px-5 py-3">
            <Button onClick={salvar} loading={salvando} disabled={!sujo} size="sm">
              Salvar
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
