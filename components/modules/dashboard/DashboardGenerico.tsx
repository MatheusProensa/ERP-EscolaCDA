import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProximosEventosWidget } from "@/components/modules/dashboard/ProximosEventosWidget";
import { MuralWidget } from "@/components/modules/dashboard/MuralWidget";
import { WidgetFallback } from "@/components/modules/dashboard/WidgetFallback";
import type { PermissoesPorModulo } from "@/lib/permissoes";
import { primeiroNome } from "@/lib/utils";

/** Dashboard de quem foi restrito pela grade de permissões a um recorte que
 * não bate com o pacote padrão do Role (ex.: nutricionista com Role
 * "Administrativo" mas acesso só a Cardápio) — os outros dashboards mostram
 * contagem de Funcionários/Estoque/Alunos direto, sem checar a grade, e isso
 * vazava dado de setor que a pessoa nem consegue abrir.
 * Atalhos Rápidos removidos daqui e de TODOS os outros dashboards (pedido
 * explícito do dono do sistema, set/2026): a Sidebar já lista os mesmos
 * setores — o atalho era navegação duplicada, e mesmo filtrado pela grade
 * seguia confundindo (ex.: Mural sempre aparecia, por ser rota liberada pra
 * qualquer login). Esse dashboard agora só tem o que é universal (Mural,
 * Próximos eventos). role/permissoes ficam nos parâmetros só porque o
 * chamador (app/(erp)/dashboard/page.tsx) sempre passa os dois — sem uso
 * aqui dentro por enquanto. */
export async function DashboardGenerico({
  nome,
}: {
  nome: string;
  role: string;
  permissoes?: PermissoesPorModulo;
}) {
  return (
    <div>
      <PageHeader title={`Bem-vindo(a) de volta, ${primeiroNome(nome)}!`} subtitle="Seu painel" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<WidgetFallback className="h-40" />}>
            <MuralWidget />
          </Suspense>
        </div>
        <Suspense fallback={<WidgetFallback className="h-60" />}>
          <ProximosEventosWidget />
        </Suspense>
      </div>
    </div>
  );
}
