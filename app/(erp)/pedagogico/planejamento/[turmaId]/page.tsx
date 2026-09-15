import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { hojeBrasilia } from "@/lib/utils";
import { semanasDoMes, statusTurmaMesDeContagem } from "@/lib/planejamento";
import { PlanejamentoTabs } from "@/components/modules/pedagogico/PlanejamentoTabs";
import { PlanejamentoMensalClient } from "@/components/modules/pedagogico/PlanejamentoMensalClient";

export default async function PlanejamentoTurmaPage({ params }: { params: Promise<{ turmaId: string }> }) {
  const { turmaId } = await params;
  const session = await auth();
  const hoje = hojeBrasilia();
  const semanasMes = semanasDoMes(hoje);
  const anoMesAtual = `${hoje.getUTCFullYear()}-${String(hoje.getUTCMonth() + 1).padStart(2, "0")}`;

  const [turma, regente, projetos, vinculo, planejamentosMes, ativGraficaMes, temaLiterarioMes, prazo] = await Promise.all([
    prisma.turma.findUnique({ where: { id: turmaId }, select: { id: true, nome: true } }),
    prisma.vinculoPedagogico.findFirst({ where: { turmaId, papel: "REGENTE" }, select: { user: { select: { name: true } } } }),
    prisma.projetoPedagogico.findMany({ where: { turmaId }, orderBy: { createdAt: "desc" } }),
    session?.user.id
      ? prisma.vinculoPedagogico.findFirst({ where: { userId: session.user.id, turmaId, papel: "REGENTE" } })
      : null,
    // Contagem do mês pros 4 pills do painel esquerdo (redesign v4, mockup
    // Gemini) — Planejamento e Roteiro compartilham o mesmo sinal (Roteiro é
    // gerado do Planejamento); Atividade Gráfica/Tema Literário têm status
    // PRÓPRIO agora (FolhaMensal, mesmo enum StatusPlanejamento).
    prisma.planejamento.findMany({ where: { turmaId, semanaInicio: { in: semanasMes }, status: { in: ["ENVIADO", "APROVADO", "DEVOLVIDO"] } }, select: { status: true } }),
    prisma.folhaMensal.findMany({ where: { turmaId, tipo: "ATIVIDADE_GRAFICA", semanaInicio: { in: semanasMes }, status: { in: ["ENVIADO", "APROVADO", "DEVOLVIDO"] } }, select: { status: true } }),
    prisma.folhaMensal.findMany({ where: { turmaId, tipo: "TEMA_LITERARIO", semanaInicio: { in: semanasMes }, status: { in: ["ENVIADO", "APROVADO", "DEVOLVIDO"] } }, select: { status: true } }),
    prisma.prazoPedagogico.findUnique({ where: { mes: anoMesAtual } }),
  ]);
  if (!turma) notFound();

  const podeEditar = session?.user.role === "ADMIN" || !!vinculo;
  const prazoVencido = !!prazo?.dataLimite && hoje > prazo.dataLimite;

  function contar(lista: { status: string }[]) {
    return { total: lista.length, aprovadas: lista.filter((p) => p.status === "APROVADO").length, devolvidas: lista.filter((p) => p.status === "DEVOLVIDO").length };
  }
  const statusPlanejamento = statusTurmaMesDeContagem(contar(planejamentosMes), semanasMes.length, prazoVencido);
  const statusAtividadeGrafica = statusTurmaMesDeContagem(contar(ativGraficaMes), semanasMes.length, prazoVencido);
  const statusTemaLiterario = statusTurmaMesDeContagem(contar(temaLiterarioMes), semanasMes.length, prazoVencido);
  // ✓ verde na aba (mockup Gemini: "documento completo esse mês") — mesma
  // regra de sempre, preservada da versão anterior: já ENVIOU todas as
  // semanas (não precisa ter sido aprovado ainda).
  const mesCompleto = planejamentosMes.length >= semanasMes.length;

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
        turmaNome={turma.nome}
        regenteNome={regente?.user.name ?? null}
        projetos={projetos.map((p) => ({ id: p.id, nome: p.nome, ativo: p.ativo }))}
        anoMesInicial={anoMesAtual}
        podeEditar={podeEditar}
        documentos={[
          { label: "Planejamento", status: statusPlanejamento },
          { label: "Roteiro", status: statusPlanejamento },
          { label: "Atividade Gráfica", status: statusAtividadeGrafica },
          { label: "Tema Literário", status: statusTemaLiterario },
        ]}
      />
    </div>
  );
}
