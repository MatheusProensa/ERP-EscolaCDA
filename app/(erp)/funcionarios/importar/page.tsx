import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { ImportarPlanilhaClient } from "@/components/modules/funcionarios/ImportarPlanilhaClient";
import { podeEditarModulo } from "@/lib/permissoes";

export default async function ImportarFuncionariosPage() {
  const session = await auth();
  if (!podeEditarModulo("/funcionarios", session?.user.role ?? "", session?.user.permissoes)) redirect("/funcionarios");

  return (
    <div>
      <PageHeader title="Importar planilha" subtitle="Cria funcionários novos e atualiza cargo, setor, contato e datas a partir de uma planilha" />
      <ImportarPlanilhaClient />
    </div>
  );
}
