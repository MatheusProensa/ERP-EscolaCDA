import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";

const MESES_LABEL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Prazo mensal do Planejamento (pedido do dono, set/2026: "coordenadora
 * define o prazo do mês"). GET é livre pra qualquer um do Pedagógico (só
 * consulta); POST só quem coordena a Área Pedagógica (ou ADMIN). */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const mes = req.nextUrl.searchParams.get("mes");
  if (!mes || !/^\d{4}-\d{2}$/.test(mes)) return NextResponse.json({ error: "Informe mes (YYYY-MM)" }, { status: 400 });

  const prazo = await prisma.prazoPedagogico.findUnique({ where: { mes } });
  return NextResponse.json({ dataLimite: prazo?.dataLimite.toISOString().slice(0, 10) ?? null });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.user.role !== "ADMIN" && !session.user.coordenaAreaPedagogica) {
    return NextResponse.json({ error: "Só quem coordena a Área Pedagógica define o prazo" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const mes = String(body?.mes ?? "");
  const dataLimiteParam = String(body?.dataLimite ?? "");
  if (!/^\d{4}-\d{2}$/.test(mes)) return NextResponse.json({ error: "mes inválido (YYYY-MM)" }, { status: 400 });
  const dataLimite = new Date(`${dataLimiteParam}T23:59:59.000Z`);
  if (Number.isNaN(dataLimite.getTime())) return NextResponse.json({ error: "dataLimite inválida" }, { status: 400 });

  try {
    // Integração com o Calendário geral da escola (pedido do dono, set/2026:
    // "prazo de entrega vira automaticamente um evento no calendário") —
    // atualiza o MESMO evento em vez de duplicar quando a data muda.
    const [anoNum, mesNum] = mes.split("-").map(Number);
    const dataEvento = new Date(`${dataLimiteParam}T00:00:00.000Z`);
    const titulo = `Prazo do Planejamento — ${MESES_LABEL[mesNum - 1]}/${anoNum}`;

    const existente = await prisma.prazoPedagogico.findUnique({ where: { mes } });
    let eventoCalendarioId = existente?.eventoCalendarioId ?? null;
    const eventoAtual = eventoCalendarioId ? await prisma.eventoCalendario.findUnique({ where: { id: eventoCalendarioId } }) : null;
    if (eventoAtual) {
      await prisma.eventoCalendario.update({ where: { id: eventoAtual.id }, data: { data: dataEvento, titulo } });
    } else {
      const novoEvento = await prisma.eventoCalendario.create({
        data: {
          titulo,
          data: dataEvento,
          categoria: "Organização Interna",
          descricao: "Prazo de entrega do Planejamento Pedagógico, definido pela coordenação.",
        },
      });
      eventoCalendarioId = novoEvento.id;
    }

    await prisma.prazoPedagogico.upsert({
      where: { mes },
      create: { mes, dataLimite, definidoPorId: session.user.id, eventoCalendarioId },
      update: { dataLimite, definidoPorId: session.user.id, eventoCalendarioId },
    });
    after(() => {
      avisarMudanca("pedagogico");
      avisarMudanca("calendario");
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
