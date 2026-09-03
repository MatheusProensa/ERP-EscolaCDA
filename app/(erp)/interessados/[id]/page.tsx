import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { InteressadoDetalhe } from "@/components/modules/interessados/InteressadoDetalhe";
import { ordenarTurmas } from "@/lib/utils";

export default async function InteressadoPerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const item = await prisma.listaEspera.findUnique({
    where: { id },
    include: { turmaDesejada: { select: { nome: true } } },
  });
  if (!item) notFound();

  const anoLetivo = await getAnoLetivoAtivo();
  const turmasRaw = await prisma.turma.findMany({ where: { anoLetivoId: anoLetivo?.id } });
  const turmas = ordenarTurmas(turmasRaw);

  return <InteressadoDetalhe item={item} turmas={turmas} />;
}
