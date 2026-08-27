import { PageHeader } from "@/components/layout/PageHeader";
import { ImportarPlanilhaClient } from "@/components/modules/alunos/ImportarPlanilhaClient";

export default function ImportarAlunosPage() {
  return (
    <div>
      <PageHeader title="Importar planilha" subtitle="Atualiza mensalidade e dados do responsável a partir de uma planilha" />
      <ImportarPlanilhaClient />
    </div>
  );
}
