import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { semanasDoMes, estadoDoDia, type ConteudoDiaPlanejamento } from "@/lib/planejamento";
import type { TipoDiaPlanejamento } from "@prisma/client";

/** Strip de progresso do mês (4 números) — pedido do dono, mockup do Gemini:
 * "Semanas preenchidas: X de Y", "Dias completos: X de Y", "Status", "Prazo".
 * Reaproveita o mesmo cálculo de status que o painel da coordenadora já usa
 * (STATUS_TURMA_MES_*), só que pro mês REALMENTE em tela (a professora pode
 * estar navegando mês a mês, diferente do hub que só olha o mês atual). */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const turmaId = req.nextUrl.searchParams.get("turmaId");
  const mesParam = req.nextUrl.searchParams.get("mes"); // "YYYY-MM"
  if (!turmaId || !mesParam || !/^\d{4}-\d{2}$/.test(mesParam)) {
    return NextResponse.json({ error: "Informe turmaId e mes (YYYY-MM)" }, { status: 400 });
  }

  try {
    const [ano, mes] = mesParam.split("-").map(Number);
    const referencia = new Date(Date.UTC(ano, mes - 1, 15));
    const semanasMes = semanasDoMes(referencia);

    const [planejamentos, prazo] = await Promise.all([
      prisma.planejamento.findMany({
        where: { turmaId, semanaInicio: { in: semanasMes } },
        include: { dias: true },
      }),
      prisma.prazoPedagogico.findUnique({ where: { mes: mesParam } }),
    ]);

    const semanasPreenchidas = planejamentos.filter((p) => p.dias.length > 0).length;
    const semanasEnviadas = planejamentos.filter((p) => p.status !== "RASCUNHO").length;
    const devolvidas = planejamentos.filter((p) => p.status === "DEVOLVIDO").length;
    const aprovadas = planejamentos.filter((p) => p.status === "APROVADO").length;

    let diasCompletos = 0;
    for (const p of planejamentos) {
      for (const d of p.dias) {
        if (estadoDoDia(d.tipo as TipoDiaPlanejamento, d.conteudo as ConteudoDiaPlanejamento) === "completo") diasCompletos += 1;
      }
    }

    // Mesma hierarquia do painel da coordenadora (devolvido > aprovado >
    // enviado > pendente/atrasado), com 1 estado a mais só pra essa tela —
    // "Em preenchimento", quando já tem rascunho mas nada foi enviado ainda
    // (o hub não precisa disso: lá só interessa "entregue ou não").
    const hoje = new Date();
    const dataLimite = prazo?.dataLimite ?? null;
    const prazoVencido = !!dataLimite && hoje > dataLimite;
    let status: "APROVADO" | "DEVOLVIDO" | "ENVIADO" | "EM_PREENCHIMENTO" | "ATRASADO" | "PENDENTE";
    if (semanasEnviadas < semanasMes.length) {
      status = semanasPreenchidas > 0 ? "EM_PREENCHIMENTO" : prazoVencido ? "ATRASADO" : "PENDENTE";
    } else if (devolvidas > 0) {
      status = "DEVOLVIDO";
    } else if (aprovadas >= semanasMes.length) {
      status = "APROVADO";
    } else {
      status = "ENVIADO";
    }

    const diasParaPrazo = dataLimite ? Math.round((dataLimite.getTime() - hoje.getTime()) / 86400000) : null;

    return NextResponse.json({
      semanasPreenchidas,
      semanasTotal: semanasMes.length,
      diasCompletos,
      diasTotal: semanasMes.length * 5,
      status,
      diasParaPrazo,
    });
  } catch (err) {
    return erroApi(err);
  }
}
