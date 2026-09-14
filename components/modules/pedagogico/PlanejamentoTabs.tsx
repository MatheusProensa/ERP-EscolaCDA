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
}: {
  turmaId: string;
  active: "planejamento" | "roteiro" | "projeto" | "rotina" | "horario";
}) {
  const base = `/pedagogico/planejamento/${turmaId}`;
  return (
    <div className="mb-5">
      <Segmented
        value={active}
        options={[
          { value: "planejamento", label: "Planejamento", href: base },
          { value: "roteiro", label: "Roteiro", href: `${base}/roteiro` },
          { value: "projeto", label: "Projeto pedagógico", href: `${base}/projeto` },
          { value: "rotina", label: "Rotina do dia a dia", href: `${base}/rotina` },
          { value: "horario", label: "Horário fixo", href: `${base}/horario` },
        ]}
      />
    </div>
  );
}
