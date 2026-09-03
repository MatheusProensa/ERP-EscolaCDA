import { UserPlus, PhoneCall, CalendarCheck, GraduationCap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { InteressadosTable } from "@/components/modules/interessados/InteressadosTable";
import { NovoInteressadoModal } from "@/components/modules/interessados/NovoInteressadoModal";
import { ordenarTurmas } from "@/lib/utils";

export default async function InteressadosPage() {
  const anoLetivo = await getAnoLetivoAtivo();
  const [itens, turmasRaw] = await Promise.all([
    prisma.listaEspera.findMany({
      include: { turmaDesejada: { select: { nome: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.turma.findMany({ where: { anoLetivoId: anoLetivo?.id } }),
  ]);
  const turmas = ordenarTurmas(turmasRaw);

  const emAndamento = itens.filter((i) =>
    ["AGUARDANDO", "CONTATADO", "CHAMAR_NOVAMENTE", "NAO_RESPONDEU", "PORTAS_ABERTAS"].includes(i.status)
  ).length;
  const visitasMarcadas = itens.filter((i) => i.dataVisita && i.status !== "MATRICULADO").length;
  const matriculadosNoFunil = itens.filter((i) => i.status === "MATRICULADO").length;

  return (
    <div>
      <PageHeader
        title="Interessados"
        subtitle="Funil de famílias interessadas — do primeiro contato até a matrícula"
        breadcrumb={[{ label: "Administrativo" }, { label: "Interessados" }]}
        action={<NovoInteressadoModal turmas={turmas} />}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard icon={UserPlus} tone="cat1" value={itens.length} label="Total no funil" />
        <MetricCard icon={PhoneCall} tone="warning" value={emAndamento} label="Em andamento" subtext="Aguardando algum contato" />
        <MetricCard icon={CalendarCheck} tone="cat5" value={visitasMarcadas} label="Visitas" subtext="Com data de visita" />
        <MetricCard icon={GraduationCap} tone="success" value={matriculadosNoFunil} label="Matriculados" subtext="Vieram desse funil" />
      </div>

      <InteressadosTable itens={itens} turmas={turmas} />
    </div>
  );
}
