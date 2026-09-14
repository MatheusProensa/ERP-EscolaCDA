"use client";

import { useEffect, useState } from "react";
import { HelpCircle, ChevronLeft, ChevronRight, X, type LucideIcon } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export type PassoTutorial = { titulo: string; texto: string; icon?: LucideIcon };

/** Tour guiado tipo onboarding de app/jogo — ideia confirmada pelo dono,
 * out/2026: "esse botão você faz isso", pra pessoal não-técnico que não tem
 * paciência de ler manual. Contextual por módulo (não é 1 tour do sistema
 * inteiro), dispara sozinho só na primeira vez que a pessoa entra naquela
 * tela, e fica sempre re-disparável pelo botão de ajuda ("?") fixo no canto.
 * Cada módulo (ex.: "pedagogico") tem sua própria marcação — ver
 * TutorialVisto no schema. */
export function TutorialGuiado({ modulo, titulo, passos }: { modulo: string; titulo: string; passos: PassoTutorial[] }) {
  const [aberto, setAberto] = useState(false);
  const [passo, setPasso] = useState(0);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function checar() {
      const res = await fetch(`/api/tutoriais?modulo=${modulo}`);
      if (cancelado) return;
      if (res.ok) {
        const data = await res.json();
        if (!data.visto) {
          setAberto(true);
          setPasso(0);
        }
      }
      setCarregado(true);
    }
    checar();
    return () => {
      cancelado = true;
    };
  }, [modulo]);

  async function marcarVisto() {
    await fetch("/api/tutoriais", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modulo }),
    });
  }

  function fechar() {
    setAberto(false);
    marcarVisto();
  }

  function abrirDeNovo() {
    setPasso(0);
    setAberto(true);
  }

  const atual = passos[passo];
  const ultimo = passo === passos.length - 1;
  const Icon = atual?.icon ?? HelpCircle;

  return (
    <>
      {carregado && (
        <button
          type="button"
          onClick={abrirDeNovo}
          aria-label="Ver tutorial dessa tela"
          title="Ver tutorial dessa tela"
          className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-cda-blue text-white shadow-lg hover:bg-cda-blue/90"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      )}

      <Modal open={aberto} onClose={fechar} title={titulo}>
        {atual && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 rounded-lg bg-cda-bg p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cda-blue/10">
                <Icon className="h-5 w-5 text-cda-blue" />
              </div>
              <div>
                <p className="text-sm font-semibold text-cda-text">{atual.titulo}</p>
                <p className="mt-1 text-sm text-cda-text2">{atual.texto}</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5">
              {passos.map((_, i) => (
                <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === passo ? "bg-cda-blue" : "bg-cda-border"}`} />
              ))}
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="ghost" size="sm" onClick={fechar}>
                <X className="h-3.5 w-3.5" />
                Pular
              </Button>
              <div className="flex gap-2">
                {passo > 0 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setPasso((p) => p - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Voltar
                  </Button>
                )}
                {ultimo ? (
                  <Button type="button" size="sm" onClick={fechar}>
                    Entendi
                  </Button>
                ) : (
                  <Button type="button" size="sm" onClick={() => setPasso((p) => p + 1)}>
                    Próximo
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
