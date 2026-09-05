import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { ImportarPlanilhaClient } from "@/components/modules/alunos/ImportarPlanilhaClient";
import { podeEditarModulo } from "@/lib/permissoes";

export default async function ImportarAlunosPage() {
  const session = await auth();
  if (!podeEditarModulo("/alunos", session?.user.role ?? "", session?.user.permissoes)) redirect("/alunos");

  return (
    <div>
      <PageHeader title="Importar planilha" subtitle="Atualiza mensalidade e dados do responsável a partir de uma planilha" />
      <ImportarPlanilhaClient />
    </div>
  );
}
