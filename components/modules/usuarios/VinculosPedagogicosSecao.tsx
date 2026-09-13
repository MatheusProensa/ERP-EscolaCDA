"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, GraduationCap, Sparkles, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { showToast } from "@/components/ui/Toast";

type Papel = "NENHUM" | "REGENTE" | "ESPECIALISTA";

type Turma = { id: string; nome: string; turno: "MANHA" | "TARDE" };

type Vinculo = { turmaId: string; papel: "REGENTE" | "ESPECIALISTA"; materia: string | null };

const TURNO_LABEL: Record<Turma["turno"], string> = { MANHA: "Manhã", TARDE: "Tarde" };

const PAPEIS: { valor: Papel; label: string; icon: typeof Ban; cor: string }[] = [
  { valor: "REGENTE", label: "Regente", icon: GraduationCap, cor: "text-cda-blue" },
  { valor: "ESPECIALISTA", label: "Especialista", icon: Sparkles, cor: "text-cda-amber" },
  { valor: "NENHUM", label: "Sem vínculo", icon: Ban, cor: "text-cda-text3" },
];

/** Vínculo de uma professora com turmas na Área Pedagógica (parecer,
 * planejamento, portfólio) — separado da grade "Acesso por setor" acima, que
 * só enxerga módulo inteiro. REGENTE é dona de 1 turma; ESPECIALISTA cobre a
 * mesma matéria em várias turmas (achado real, out/2026: Ed. Física,
 * Musicalização e Inglês são sempre a mesma pessoa em N turmas, nunca "dona"
 * de 1 turma só como a regente). */
export function VinculosPedagogicosSecao({
  usuarioId,
  usuarioNome,
  turmas,
  vinculosSalvos,
  podeEditar = true,
}: {
  usuarioId: string;
  usuarioNome: string;
  turmas: Turma[];
  vinculosSalvos: Vinculo[];
  podeEditar?: boolean;
}) {
  const router = useRouter();
  const salvosPorTurma = useMemo(() => Object.fromEntries(vinculosSalvos.map((v) => [v.turmaId, v])), [vinculosSalvos]);

  const [papeis, setPapeis] = useState<Record<string, Papel>>(() =>
    Object.fromEntries(turmas.map((t) => [t.id, salvosPorTurma[t.id]?.papel ?? "NENHUM"]))
  );
  const [materias, setMaterias] = useState<Record<string, string>>(() =>
    Object.fromEntries(turmas.map((t) => [t.id, salvosPorTurma[t.id]?.materia ?? ""]))
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState(true);

  const vinculadas = Object.values(papeis).filter((p) => p !== "NENHUM").length;

  const sujo = turmas.some((t) => {
    const salvo = salvosPorTurma[t.id];
    const papelSalvo = salvo?.papel ?? "NENHUM";
    if (papeis[t.id] !== papelSalvo) return true;
    if (papeis[t.id] === "ESPECIALISTA") return materias[t.id].trim() !== (salvo?.materia ?? "");
    return false;
  });

  function definirPapel(turmaId: string, papel: Papel) {
    setPapeis((atual) => ({ ...atual, [turmaId]: papel }));
  }

  async function salvar() {
    setErro("");
    const semMateria = turmas.find((t) => papeis[t.id] === "ESPECIALISTA" && !materias[t.id].trim());
    if (semMateria) {
      setErro(`Informe a matéria da especialista em "${semMateria.nome}".`);
      return;
    }
    setSalvando(true);
    const vinculos = turmas
      .filter((t) => papeis[t.id] !== "NENHUM")
      .map((t) => ({ turmaId: t.id, papel: papeis[t.id], materia: papeis[t.id] === "ESPECIALISTA" ? materias[t.id].trim() : undefined }));
    const res = await fetch(`/api/usuarios/${usuarioId}/vinculos-pedagogicos`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vinculos }),
    });
    setSalvando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível salvar os vínculos.");
      return;
    }
    showToast(`Vínculos pedagógicos de ${usuarioNome} atualizados.`);
    router.refresh();
  }

  if (!turmas.length) return null;

  return (
    <Card>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-cda-text">Vínculo com turmas (Área Pedagógica)</h3>
          <Badge variant={vinculadas > 0 ? "count" : "neutral"}>
            {vinculadas > 0 ? `${vinculadas} turma(s)` : "Nenhuma turma"}
          </Badge>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-cda-text3 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>

      {aberto && (
        <>
          <p className="border-y border-cda-border px-5 py-3 text-sm text-cda-text2">
            <strong>Regente</strong> é dona da turma inteira (1 turma). <strong>Especialista</strong> cobre uma
            matéria específica (Ed. Física, Musicalização, Inglês...), podendo dar em várias turmas ao mesmo tempo.
          </p>
          <div className="flex flex-col divide-y divide-cda-border">
            {turmas.map((turma) => (
              <div key={turma.id} className="flex flex-col gap-2 px-5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-medium text-cda-text">
                    {turma.nome} <span className="text-xs font-normal text-cda-text3">({TURNO_LABEL[turma.turno]})</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PAPEIS.map(({ valor, label, icon: Icon, cor }) => {
                      const ativo = papeis[turma.id] === valor;
                      return (
                        <button
                          key={valor}
                          type="button"
                          disabled={!podeEditar}
                          onClick={() => definirPapel(turma.id, valor)}
                          title={label}
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
                {papeis[turma.id] === "ESPECIALISTA" && (
                  <Input
                    placeholder="Matéria (ex.: Educação Física, Inglês)"
                    value={materias[turma.id]}
                    onChange={(e) => setMaterias((atual) => ({ ...atual, [turma.id]: e.target.value }))}
                    disabled={!podeEditar}
                    className="sm:max-w-xs"
                  />
                )}
              </div>
            ))}
          </div>
          {erro && <p className="px-5 py-3 text-sm text-cda-red">{erro}</p>}
          {podeEditar && (
            <div className="flex justify-end border-t border-cda-border px-5 py-3">
              <Button onClick={salvar} loading={salvando} disabled={!sujo} size="sm">
                Salvar
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
