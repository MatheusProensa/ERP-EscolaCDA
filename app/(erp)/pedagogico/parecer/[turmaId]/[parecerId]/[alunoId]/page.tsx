import { PageHeader } from "@/components/layout/PageHeader";
import { ParecerAlunoClient } from "@/components/modules/pedagogico/ParecerAlunoClient";

export default async function ParecerAlunoPage({
  params,
}: {
  params: Promise<{ turmaId: string; parecerId: string; alunoId: string }>;
}) {
  const { turmaId, parecerId, alunoId } = await params;

  return (
    <div>
      <PageHeader title="Parecer do aluno" breadcrumb={[{ label: "Pedagógico", href: "/pedagogico" }, { label: "Parecer" }]} />
      <ParecerAlunoClient parecerId={parecerId} alunoId={alunoId} turmaId={turmaId} />
    </div>
  );
}
