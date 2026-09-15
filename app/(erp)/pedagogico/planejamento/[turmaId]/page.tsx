import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { hojeBrasilia } from "@/lib/utils";
import { semanasDoMes } from "@/lib/planejamento";
import { PlanejamentoTabs } from "@/components/modules/pedagogico/PlanejamentoTabs";
import { PlanejamentoMensalClient } from "@/components/modules/pedagogico/PlanejamentoMensalClient";

export default async function PlanejamentoTurmaPage({ params }: { params: Promise<{ turmaId: string }> }) {
  const { turmaId } = await params;
  const session = await auth();
  const hoje = hojeBrasilia();
  const semanasMes = semanasDoMes(hoje);

  const [turma, projetos, vinculo, semanasEnviadas] = await Promise.all([
    prisma.turma.findUnique({ where: { id: turmaId }, select: { id: true, nome: true } }),
    prisma.projetoPedagogico.findMany({ where: { turmaId }, orderBy: { createdAt: "desc" } }),
    session?.user.id
      ? prisma.vinculoPedagogico.findFirst({ where: { userId: session.user.id, turmaId, papel: "REGENTE" } })
      : null,
    // Só pro ✓ verde da aba (mockup do Gemini: "documento completo esse
    // mês") — Roteiro é gerado do Planejamento, então os 2 compartilham o
    // mesmo sinal de completude.
    prisma.planejamento.count({ where: { turmaId, semanaInicio: { in: semanasMes }, status: { in: ["ENVIADO", "APROVADO", "DEVOLVIDO"] } } }),
  ]);
  if (!turma) notFound();

  const podeEditar = session?.user.role === "ADMIN" || !!vinculo;
  const anoMesInicial = `${hoje.getUTCFullYear()}-${String(hoje.getUTCMonth() + 1).padStart(2, "0")}`;
  const mesCompleto = semanasEnviadas >= semanasMes.length;

  return (
    <div>
      <PageHeader
        title={`Planejamento — ${turma.nome}`}
        subtitle="O que a turma vai viver cada dia — preencha a semana, clique em Finalizar pra enviar."
        breadcrumb={[{ label: "Pedagógico", href: "/pedagogico" }, { label: turma.nome }]}
      />
      <PlanejamentoTabs turmaId={turma.id} active="planejamento" completos={{ planejamento: mesCompleto, roteiro: mesCompleto }} />
      <PlanejamentoMensalClient
        turmaId={turma.id}
        projetos={projetos.map((p) => ({ id: p.id, nome: p.nome, ativo: p.ativo }))}
        anoMesInicial={anoMesInicial}
        podeEditar={podeEditar}
      />
    </div>
  );
}
