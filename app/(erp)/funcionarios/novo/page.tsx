import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { FuncionarioForm } from "@/components/modules/funcionarios/FuncionarioForm";
import { podeEditarModulo } from "@/lib/permissoes";

export default async function NovoFuncionarioPage() {
  const session = await auth();
  if (!podeEditarModulo("/funcionarios", session?.user.role ?? "", session?.user.permissoes)) redirect("/funcionarios");

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
