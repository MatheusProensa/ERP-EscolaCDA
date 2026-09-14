import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";
import { diasDaSemana, isoData, semanasDoMes } from "@/lib/planejamento";

async function podeEscrever(userId: string, role: string, turmaId: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  const vinculo = await prisma.vinculoPedagogico.findFirst({ where: { userId, turmaId, papel: "REGENTE" } });
  return !!vinculo;
}

/** Duplica o planejamento do mês anterior como ponto de partida do mês em
 * tela (pedido do dono, set/2026: "não começa do zero todo mês"). Casa
 * semana-a-semana pela POSIÇÃO dentro do mês (1ª semana de origem → 1ª
 * semana de destino etc, não pela data em si — os dois meses raramente têm
 * o mesmo número de semanas). NUNCA sobrescreve uma semana do mês destino
 * que já tem algo preenchido — só entra onde ainda tá vazio, pra não
 * atropelar trabalho que a regente já começou. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const turmaId = String(body?.turmaId ?? "");
  const anoMesDestino = String(body?.anoMes ?? "");
  if (!turmaId || !/^\d{4}-\d{2}$/.test(anoMesDestino)) {
    return NextResponse.json({ error: "Informe turmaId e anoMes (YYYY-MM)" }, { status: 400 });
  }
  if (!(await podeEscrever(session.user.id, session.user.role, turmaId))) {
    return NextResponse.json({ error: "Só a professora regente dessa turma edita o planejamento" }, { status: 403 });
  }

  const [anoDestino, mesDestino] = anoMesDestino.split("-").map(Number);
  const referenciaDestino = new Date(Date.UTC(anoDestino, mesDestino - 1, 15));
  const referenciaOrigem = new Date(Date.UTC(anoDestino, mesDestino - 2, 15)); // mês anterior

  const semanasDestino = semanasDoMes(referenciaDestino);
  const semanasOrigem = semanasDoMes(referenciaOrigem);

  const [planejamentosDestino, planejamentosOrigem] = await Promise.all([
    prisma.planejamento.findMany({ where: { turmaId, semanaInicio: { in: semanasDestino } }, include: { dias: true } }),
    prisma.planejamento.findMany({ where: { turmaId, semanaInicio: { in: semanasOrigem } }, include: { dias: true } }),
  ]);
  const destinoPorSemana = new Map(planejamentosDestino.map((p) => [isoData(p.semanaInicio), p]));
  const origemPorSemana = new Map(planejamentosOrigem.map((p) => [isoData(p.semanaInicio), p]));

  let copiadas = 0;
  let puladas = 0;

  try {
    for (let i = 0; i < Math.min(semanasDestino.length, semanasOrigem.length); i++) {
      const origem = origemPorSemana.get(isoData(semanasOrigem[i]));
      if (!origem || origem.dias.length === 0) continue; // nada pra copiar dessa semana

      const destinoExistente = destinoPorSemana.get(isoData(semanasDestino[i]));
      if (destinoExistente && destinoExistente.dias.length > 0) {
        puladas++;
        continue; // já tem conteúdo — nunca sobrescreve
      }

      const diasDestino = diasDaSemana(semanasDestino[i]);
      const diasOrigemPorData = new Map(origem.dias.map((d) => [isoData(d.data), d]));
      const diasOrigemOrdenados = diasDaSemana(semanasOrigem[i]).map((data) => diasOrigemPorData.get(isoData(data)));

      // Projeto só copia se ainda existir e for dessa turma — projeto de mês
      // passado pode já ter sido encerrado.
      let projetoId: string | null = null;
      if (origem.projetoId) {
        const projeto = await prisma.projetoPedagogico.findUnique({ where: { id: origem.projetoId } });
        if (projeto && projeto.turmaId === turmaId) projetoId = projeto.id;
      }

      await prisma.$transaction(async (tx) => {
        const registro = await tx.planejamento.upsert({
          where: { turmaId_semanaInicio: { turmaId, semanaInicio: semanasDestino[i] } },
          create: { turmaId, semanaInicio: semanasDestino[i], projetoId, materiais: origem.materiais, autorId: session.user.id },
          update: { projetoId, materiais: origem.materiais, autorId: session.user.id },
        });
        await tx.planejamentoDia.deleteMany({ where: { planejamentoId: registro.id } });
        await tx.planejamentoDia.createMany({
          data: diasDestino
            .map((data, indice) => {
              const diaOrigem = diasOrigemOrdenados[indice];
              if (!diaOrigem) return null;
              return {
                planejamentoId: registro.id,
                data,
                tipo: diaOrigem.tipo,
                conteudo: diaOrigem.conteudo as object,
                especializadas: diaOrigem.especializadas,
              };
            })
            .filter((d): d is NonNullable<typeof d> => d !== null),
        });
      });
      copiadas++;
    }

    if (copiadas > 0) {
      await prisma.logAtividade.create({
        data: {
          acao: `Planejamento de ${anoMesDestino} duplicado do mês anterior (${copiadas} semana(s))`,
          entidade: "Planejamento",
          entidadeId: turmaId,
          usuario: session.user.name ?? "Usuário",
        },
      });
    }

    after(() => avisarMudanca("pedagogico"));
    return NextResponse.json({ ok: true, copiadas, puladas });
  } catch (err) {
    return erroApi(err);
  }
}
