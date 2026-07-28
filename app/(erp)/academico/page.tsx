import { GraduationCap, Users, DoorOpen, School } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { Button } from "@/components/ui/Button";

export default async function AcademicoPage() {
  const anoLetivo = await prisma.anoLetivo.findFirst({ where: { ativo: true } });

  const [turmas, totalAlunos] = await Promise.all([
    prisma.turma.findMany({
      where: { anoLetivoId: anoLetivo?.id },
      select: { capacidade: true, _count: { select: { matriculas: { where: { situacao: "ATIVA" } } } } },
    }),
    prisma.matricula.count({ where: { anoLetivoId: anoLetivo?.id, situacao: "ATIVA" } }),
  ]);
  const vagasDisponiveis = turmas.reduce((acc, t) => acc + Math.max(0, t.capacidade - t._count.matriculas), 0);

  return (
    <div>
      <PageHeader
        title="Acadêmico"
        subtitle={`Ano letivo ${anoLetivo?.ano ?? "—"}`}
        breadcrumb={[{ label: "Acadêmico" }]}
        action={<Button href="/academico/turmas">Gerenciar turmas</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={School} iconColor="#1A6FD8" value={turmas.length} label="Turmas ativas" />
        <MetricCard icon={Users} iconColor="#16A34A" value={totalAlunos} label="Alunos matriculados" />
        <MetricCard icon={DoorOpen} iconColor="#D97706" value={vagasDisponiveis} label="Vagas disponíveis" />
        <MetricCard
          icon={GraduationCap}
          iconColor="#7C3AED"
          value={turmas.length > 0 ? Math.round(totalAlunos / turmas.length) : 0}
          label="Média de alunos/turma"
        />
      </div>
    </div>
  );
}
