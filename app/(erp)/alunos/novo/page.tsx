import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { PageHeader } from "@/components/layout/PageHeader";
import { AlunoForm } from "@/components/modules/alunos/AlunoForm";
import { podeEditarModulo } from "@/lib/permissoes";
import { ordenarTurmas } from "@/lib/utils";
import { turmasComMatriculados } from "@/lib/turmas";

export default async function NovoAlunoPage() {
  const session = await auth();
  // Sem o botão "Novo aluno" na listagem quem é só VER nem vê o caminho até
  // aqui — mas a URL em si é um GET normal, e a grade só bloqueia
  // escrita (POST/PUT/PATCH/DELETE). Sem essa checagem, dava pra abrir
  // /alunos/novo digitando o endereço direto mesmo sendo só leitura.
  if (!podeEditarModulo("/alunos", session?.user.role ?? "", session?.user.permissoes)) redirect("/alunos");

  const anoLetivo = await getAnoLetivoAtivo();
  const turmasBrutas = ordenarTurmas(await prisma.turma.findMany({ where: { anoLetivoId: anoLetivo?.id } }));
  const turmas = await turmasComMatriculados(turmasBrutas);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Novo aluno"
        subtitle="Cadastro completo, responsável e matrícula"
        breadcrumb={[{ label: "Alunos", href: "/alunos" }, { label: "Novo" }]}
      />
      <AlunoForm turmas={turmas} />
    </div>
  );
}
