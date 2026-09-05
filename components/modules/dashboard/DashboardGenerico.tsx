import { Suspense } from "react";
import {
  Package, KeyRound, Users, GraduationCap, UtensilsCrossed, Cake, UserPlus,
  UserCog, CalendarClock, FileText, Barcode, Receipt, Clock, type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AtalhosRapidos, type Atalho } from "@/components/modules/dashboard/AtalhosRapidos";
import { ProximosEventosWidget } from "@/components/modules/dashboard/ProximosEventosWidget";
import { MuralWidget } from "@/components/modules/dashboard/MuralWidget";
import { WidgetFallback } from "@/components/modules/dashboard/WidgetFallback";
import { podeVerModulo, type PermissoesPorModulo } from "@/lib/permissoes";
import { primeiroNome } from "@/lib/utils";

// Lista própria (não importa a da Sidebar, que é "use client" — ícone
// atravessando esse limite quebra igual ao que já aconteceu antes com
// CardapioExportButtons) — cada item com o ícone e a cor categórica que
// melhor representa o setor, igual a Sidebar já usa.
// Mural NÃO entra aqui de propósito: a rota /mural não tem regra de acesso
// nenhuma (é liberada pra qualquer login, sempre foi) — colocar ela na lista
// faria o atalho aparecer pra todo mundo que cai nesse dashboard, mesmo quem
// a grade restringiu a um setor só. O widget de Mural mais embaixo continua
// (aviso geral da escola cabe pra qualquer funcionário ver).
const CANDIDATOS: { label: string; href: string; icon: LucideIcon; tone: Atalho["tone"] }[] = [
  { label: "Acadêmico", href: "/academico", icon: GraduationCap, tone: "cat3" },
  { label: "Alunos", href: "/alunos", icon: Users, tone: "cat1" },
  { label: "Cardápio", href: "/cardapio", icon: UtensilsCrossed, tone: "cat3" },
  { label: "Aniversariantes", href: "/aniversariantes", icon: Cake, tone: "cat5" },
  { label: "Interessados", href: "/interessados", icon: UserPlus, tone: "cat1" },
  { label: "Funcionários", href: "/funcionarios", icon: UserCog, tone: "cat5" },
  { label: "Horários da Equipe", href: "/horarios-equipe", icon: CalendarClock, tone: "cat2" },
  { label: "Estoque", href: "/estoque", icon: Package, tone: "cat6" },
  { label: "Chaves", href: "/chaves", icon: KeyRound, tone: "cat3" },
  { label: "Documentos", href: "/documentos", icon: FileText, tone: "cat2" },
  { label: "Boletos", href: "/boletos", icon: Barcode, tone: "cat1" },
  { label: "Notas Fiscais", href: "/notas-fiscais", icon: Receipt, tone: "cat2" },
  { label: "Ponto", href: "/ponto", icon: Clock, tone: "cat4" },
];

/** Dashboard de quem foi restrito pela grade de permissões a um recorte que
 * não bate com o pacote padrão do Role (ex.: nutricionista com Role
 * "Administrativo" mas acesso só a Cardápio) — os outros dashboards mostram
 * contagem de Funcionários/Estoque/Alunos direto, sem checar a grade, e isso
 * vazava dado de setor que a pessoa nem consegue abrir. Esse aqui só monta
 * atalho pro que a grade realmente libera, mais o que já é universal
 * (Mural, Próximos eventos). */
export async function DashboardGenerico({
  nome,
  role,
  permissoes,
}: {
  nome: string;
  role: string;
  permissoes?: PermissoesPorModulo;
}) {
  const atalhos: Atalho[] = CANDIDATOS.filter((c) => podeVerModulo(c.href, role, permissoes)).map((c) => ({
    label: c.label, href: c.href, icon: c.icon, tone: c.tone,
  }));

  return (
    <div>
      <PageHeader title={`Bem-vindo(a) de volta, ${primeiroNome(nome)}!`} subtitle="Seus atalhos" />

      {atalhos.length > 0 && <AtalhosRapidos itens={atalhos} />}

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
