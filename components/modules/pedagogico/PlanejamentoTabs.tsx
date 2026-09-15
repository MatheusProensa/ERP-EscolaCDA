import { CheckCircle2 } from "lucide-react";
import { Segmented } from "@/components/ui/Segmented";

/** Abas da área de Planejamento da turma — pedido do dono, set/2026: "nem eu
 * to conseguindo me achar lá, não tá nem um pouco didático". Antes tudo
 * (Projeto, Rotina, Horário, Planejamento) vivia empilhado numa página só,
 * competindo com o que se usa toda semana. Agora cada coisa é sua própria
 * rota — landing direto no Planejamento (o que se mexe toda semana);
 * Projeto/Rotina/Horário (mexe raramente) ficam a 1 clique, fora do caminho.
 * Mesmo padrão de AcademicoTabs (rotas irmãs → <Segmented>). */
export function PlanejamentoTabs({
  turmaId,
  active,
  completos,
}: {
  turmaId: string;
  active: "planejamento" | "roteiro" | "atividade-grafica" | "tema-literario" | "projeto" | "rotina" | "horario";
  /** ✓ verde na aba — pedido do dono, mockup do Gemini: "documento completo
   * esse mês". Planejamento/Roteiro compartilham o mesmo sinal (Roteiro é
   * gerado do Planejamento). Atividade Gráfica/Tema Literário têm status
   * PRÓPRIO agora (fluxo de aprovação de verdade, pedido do dono) — cada um
   * com seu sinal. Projeto/Rotina/Horário são configuração da turma, sem
   * ideia de "completo esse mês". */
  completos?: { planejamento?: boolean; roteiro?: boolean; atividadeGrafica?: boolean; temaLiterario?: boolean };
}) {
  const base = `/pedagogico/planejamento/${turmaId}`;
  const rotulo = (texto: string, completo?: boolean) => (
    <span className="inline-flex items-center gap-1">
      {texto}
      {completo && <CheckCircle2 className="h-3.5 w-3.5 text-cda-green" aria-label="Completo esse mês" />}
    </span>
  );
  return (
    <div className="mb-5">
      <Segmented
        value={active}
        options={[
          { value: "planejamento", label: rotulo("Planejamento", completos?.planejamento), href: base },
          { value: "roteiro", label: rotulo("Roteiro", completos?.roteiro), href: `${base}/roteiro` },
          { value: "atividade-grafica", label: rotulo("Atividade Gráfica", completos?.atividadeGrafica), href: `${base}/atividade-grafica` },
          { value: "tema-literario", label: rotulo("Tema Literário", completos?.temaLiterario), href: `${base}/tema-literario` },
          { value: "projeto", label: "Projeto pedagógico", href: `${base}/projeto` },
          { value: "rotina", label: "Rotina do dia a dia", href: `${base}/rotina` },
          { value: "horario", label: "Horário fixo", href: `${base}/horario` },
        ]}
      />
    </div>
  );
}
