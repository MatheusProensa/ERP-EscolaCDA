import { Segmented } from "@/components/ui/Segmented";

/**
 * Abas "Turmas" / "Alunos" / "Lista de espera" no topo das páginas do módulo
 * Acadêmico — dá a sensação de uma seção única, mas cada aba continua sendo
 * sua própria rota/Server Component, preservando o fetch de dados e as
 * regras de permissão (`lib/permissoes.ts`) que já existem pra cada rota.
 * Ficam de fora da Sidebar (que só lista "Acadêmico") pra não duplicar duas
 * entradas ativas ao mesmo tempo quando se está numa sub-rota.
 *
 * Rotas irmãs do mesmo módulo → <Segmented> (handoff de design, etapa 4.7),
 * em vez de reimplementar o mesmo visual à mão.
 */
export function AcademicoTabs({
  active,
  totalTurmas,
  totalAlunos,
  totalListaEspera,
}: {
  active: "turmas" | "alunos" | "lista-espera";
  totalTurmas?: number;
  totalAlunos?: number;
  totalListaEspera?: number;
}) {
  return (
    <div className="mb-5">
      <Segmented
        value={active}
        options={[
          { value: "turmas", label: "Turmas", href: "/academico", count: totalTurmas },
          { value: "alunos", label: "Alunos", href: "/alunos", count: totalAlunos },
          { value: "lista-espera", label: "Lista de espera", href: "/academico/lista-espera", count: totalListaEspera },
        ]}
      />
    </div>
  );
}
