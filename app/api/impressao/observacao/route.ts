import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";

/** Observação livre da secretaria por turma+mês, na Fila de Impressão
 * (pedido do dono, out/2026) — 1 nota por (turma, mês), sobrescrita a cada
 * salvamento (não é histórico). */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const turmaId = String(body?.turmaId ?? "");
  const anoMes = String(body?.anoMes ?? "");
  const texto = typeof body?.texto === "string" ? body.texto.trim() : "";
  if (!turmaId || !/^\d{4}-\d{2}$/.test(anoMes)) {
    return NextResponse.json({ error: "Informe turmaId e anoMes (YYYY-MM)" }, { status: 400 });
  }

  try {
    if (texto) {
      await prisma.observacaoImpressao.upsert({
        where: { turmaId_anoMes: { turmaId, anoMes } },
        create: { turmaId, anoMes, texto },
        update: { texto },
      });
    } else {
      await prisma.observacaoImpressao.deleteMany({ where: { turmaId, anoMes } });
    }

    after(() => avisarMudanca("impressao"));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
