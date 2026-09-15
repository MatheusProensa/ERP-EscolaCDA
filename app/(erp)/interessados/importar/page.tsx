import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { ImportarPlanilhaClient } from "@/components/modules/interessados/ImportarPlanilhaClient";
import { podeEditarModulo } from "@/lib/permissoes";

export default async function ImportarInteressadosPage() {
  const session = await auth();
  if (!podeEditarModulo("/interessados", session?.user.role ?? "", session?.user.permissoes)) redirect("/interessados");

  return (
    <div>
      <PageHeader title="Importar planilha" subtitle="Cria novos interessados no funil a partir de uma planilha ou lista" />
      <ImportarPlanilhaClient />
    </div>
  );
}
