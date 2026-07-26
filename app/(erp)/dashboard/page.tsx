import { auth } from "@/lib/auth";
import { DashboardAdmin } from "@/components/modules/dashboard/DashboardAdmin";
import { DashboardFinanceiro } from "@/components/modules/dashboard/DashboardFinanceiro";
import { DashboardPedagogico } from "@/components/modules/dashboard/DashboardPedagogico";
import { DashboardAdministrativo } from "@/components/modules/dashboard/DashboardAdministrativo";

export default async function DashboardPage() {
  const session = await auth();
  const role = session!.user.role;

  if (role === "FINANCEIRO") return <DashboardFinanceiro />;
  if (role === "PEDAGOGICO") return <DashboardPedagogico />;
  if (role === "ADMINISTRATIVO") return <DashboardAdministrativo />;
  return <DashboardAdmin />;
}
