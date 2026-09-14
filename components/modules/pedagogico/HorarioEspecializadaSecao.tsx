"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { showToast } from "@/components/ui/Toast";

const LABEL_DIA = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];

type DiaHorario = { diaSemana: number; texto: string };

/** Horário fixo das aulas especializadas da turma (Bilíngue, Ed. Física,
 * Capoeira, Musicalização) — preenche 1 vez aqui e o planejamento semanal já
 * vem com isso pronto em cada dia (achado real, set/2026: o horário se
 * repete igual toda semana no documento real da escola). */
export function HorarioEspecializadaSecao({ turmaId, podeEditar }: { turmaId: string; podeEditar: boolean }) {
  const [dias, setDias] = useState<DiaHorario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      setCarregando(true);
      const res = await fetch(`/api/horarios-especializadas?turmaId=${turmaId}`);
      if (cancelado) return;
      if (res.ok) {
        const data = await res.json();
        setDias(data.dias);
      }
      setCarregando(false);
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [turmaId]);

  function atualizar(diaSemana: number, texto: string) {
    setDias((atual) => atual.map((d) => (d.diaSemana === diaSemana ? { ...d, texto } : d)));
  }

  async function salvar() {
    setSalvando(true);
    setErro("");
    const res = await fetch("/api/horarios-especializadas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turmaId, dias }),
    });
    setSalvando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível salvar o horário.");
      return;
    }
    showToast("Horário de especializadas salvo.");
  }

  if (carregando) return null;
  // Sem nada preenchido e sem quem edite: mostra um aviso simples em vez de
  // sumir — agora é página própria (não mais 1 de várias seções empilhadas),
  // sumir por completo deixaria a tela em branco sem explicação.
  if (!podeEditar && dias.every((d) => !d.texto)) {
    return (
      <Card>
        <EmptyState icon={CalendarClock} title="Ainda não tem horário fixo cadastrado" subtitle="Só a regente dessa turma preenche isso." />
      </Card>
    );
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-cda-blue" />
          Horário fixo das especializadas
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5">
        {dias.map((dia) => (
          <div key={dia.diaSemana} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-cda-text2">{LABEL_DIA[dia.diaSemana]}</label>
            <textarea
              value={dia.texto}
              onChange={(e) => atualizar(dia.diaSemana, e.target.value)}
              disabled={!podeEditar}
              rows={3}
              placeholder="ex.: Bilíngue às 13h45"
              className="w-full rounded-lg border border-cda-border bg-white px-3 py-2 text-sm text-cda-text outline-none transition-colors focus:border-cda-blue disabled:bg-cda-bg disabled:text-cda-text3"
            />
          </div>
        ))}
      </div>
      {erro && <p className="px-5 pb-3 text-sm text-cda-red">{erro}</p>}
      {podeEditar && (
        <div className="flex justify-end px-5 pb-4">
          <Button size="sm" onClick={salvar} loading={salvando}>
            Salvar horário
          </Button>
        </div>
      )}
    </Card>
  );
}
