"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Ban, ShieldCheck, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { showToast } from "@/components/ui/Toast";
import { MODULOS, type NivelPermissao } from "@/lib/permissoes";

type Nivel = NivelPermissao | "HERDAR";

// Pedido explícito do dono do sistema (ago/2026): o Perfil de acesso não
// decide mais nada sozinho pra esses setores — só essa grade, setor por
// setor, pessoa por pessoa. Sem marcação = sem acesso; por isso não tem mais
// opção de "usar o padrão do perfil".
const NIVEIS: { valor: Nivel; label: string; icon: typeof Eye; cor: string }[] = [
  { valor: "EDITAR", label: "Editar", icon: ShieldCheck, cor: "text-cda-green" },
  { valor: "VER", label: "Só visualizar", icon: Eye, cor: "text-cda-amber" },
  { valor: "NENHUM", label: "Sem acesso", icon: Ban, cor: "text-cda-red" },
];

export function PermissoesUsuarioSecao({
  usuarioId,
  usuarioNome,
  souEu,
  role,
  permissoesSalvas,
}: {
  usuarioId: string;
  usuarioNome: string;
  souEu: boolean;
  role: string;
  permissoesSalvas: Record<string, string>;
}) {
  const router = useRouter();
  const [valores, setValores] = useState<Record<string, Nivel>>(() =>
    Object.fromEntries(MODULOS.map((m) => [m.chave, (permissoesSalvas[m.chave] as Nivel) ?? "NENHUM"]))
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const liberados = Object.values(permissoesSalvas).filter((v) => v === "EDITAR" || v === "VER").length;
  // Isso aqui decide de verdade o que a pessoa acessa (não é mais um extra
  // opcional) — fica aberto por padrão pra não esconder que alguém sem nada
  // marcado não vê setor nenhum.
  const [aberto, setAberto] = useState(true);

  const sujo = useMemo(
    () => MODULOS.some((m) => valores[m.chave] !== ((permissoesSalvas[m.chave] as Nivel) ?? "NENHUM")),
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

  // ADMIN sempre vê e edita tudo (bypass fixo em lib/permissoes.ts) — a grade
  // não vale nada pra esse papel, então mostrar tudo em "Sem acesso" (nível
  // salvo real, já que nunca é preciso marcar nada pra um ADMIN) só confundia
  // ("mostrou que eu não tenho acesso, mas eu posso tudo mesmo" — relatado
  // pelo dono do sistema, ago/2026).
  if (role === "ADMIN") {
    return (
      <Card>
        <div className="flex items-center gap-2 px-5 py-4">
          <h3 className="text-sm font-semibold text-cda-text">Acesso por setor</h3>
          <Badge variant="green">Acesso total</Badge>
        </div>
        <p className="border-t border-cda-border px-5 py-3 text-sm text-cda-text2">
          <strong>{usuarioNome}</strong> é Admin — tem acesso completo a todos os setores, essa grade não se aplica.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-cda-text">Acesso por setor</h3>
          <Badge variant={liberados > 0 ? "green" : "red"}>
            {liberados > 0 ? `${liberados} setor(es) liberado(s)` : "Nenhum setor liberado"}
          </Badge>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-cda-text3 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>

      {aberto && (
        <>
          <p className="border-y border-cda-border px-5 py-3 text-sm text-cda-text2">
            É isto aqui que decide o que <strong>{usuarioNome}</strong> vê e edita — o Setor lá em cima é só uma
            etiqueta, não libera nada sozinho. Setor sem marcação fica sem acesso.
          </p>
          <div className="flex flex-col divide-y divide-cda-border">
            {MODULOS.map((modulo) => (
              <div key={modulo.chave} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <span className="text-sm font-medium text-cda-text">{modulo.label}</span>
                <div className="flex flex-wrap gap-1.5">
                  {NIVEIS.map(({ valor, label, icon: Icon, cor }) => {
                    const ativo = valores[modulo.chave] === valor;
                    // Ninguém mexe na própria permissão de Usuários — evita se trancar
                    // fora dessa tela sem ter como voltar atrás (ADMIN escapa disso,
                    // sempre vê tudo, mas Direção/outros com acesso a Usuários não).
                    const bloqueadoAutoUsuarios = souEu && modulo.chave === "usuarios";
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
