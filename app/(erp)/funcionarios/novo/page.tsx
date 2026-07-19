import { PageHeader } from "@/components/layout/PageHeader";
import { FuncionarioForm } from "@/components/modules/funcionarios/FuncionarioForm";

export default function NovoFuncionarioPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Novo funcionário"
        breadcrumb={[{ label: "Funcionários", href: "/funcionarios" }, { label: "Novo" }]}
      />
      <FuncionarioForm />
    </div>
  );
}
