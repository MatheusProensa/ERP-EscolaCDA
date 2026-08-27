import { auth } from "@/lib/auth";
import { DashboardAdmin } from "@/components/modules/dashboard/DashboardAdmin";
import { DashboardPedagogico } from "@/components/modules/dashboard/DashboardPedagogico";
import { DashboardAdministrativo } from "@/components/modules/dashboard/DashboardAdministrativo";

export default async function DashboardPage() {
  const session = await auth();
  const role = session!.user.role;
  const nome = session!.user.name ?? "";

  // FINANCEIRO não tem mais dashboard próprio — a escola não gerencia
  // mensalidade/pagamento dentro do sistema (usa o Banrisul pra isso).
  if (role === "PEDAGOGICO") return <DashboardPedagogico nome={nome} />;
  if (role === "ADMINISTRATIVO") return <DashboardAdministrativo nome={nome} />;
  return <DashboardAdmin nome={nome} />;
}
