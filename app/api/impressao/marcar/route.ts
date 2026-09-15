import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";
import { semanasDoMes } from "@/lib/planejamento";

const TIPOS = ["PLANEJAMENTO", "ROTEIRO", "ATIVIDADE_GRAFICA", "TEMA_LITERARIO"] as const;
type Tipo = (typeof TIPOS)[number];

const LABEL: Record<Tipo, string> = {
  PLANEJAMENTO: "Planejamento",
  ROTEIRO: "Roteiro",
  ATIVIDADE_GRAFICA: "Atividade Gráfica",
  TEMA_LITERARIO: "Tema Literário",
};

/** Marca (ou desmarca) um documento como impresso na Fila de Impressão —
 * pedido do dono, out/2026. Aplica em TODAS as semanas aprovadas do mês pra
 * esse documento de uma vez (a tela mostra 1 linha por documento/mês, que
 * agrega as semanas — ver agregarDocumento em app/(erp)/impressao/page.tsx),
 * nunca numa semana ainda não aprovada. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const turmaId = String(body?.turmaId ?? "");
  const anoMes = String(body?.anoMes ?? "");
  const tipo = TIPOS.includes(body?.tipo) ? (body.tipo as Tipo) : null;
  const impresso = body?.impresso === true;
  if (!turmaId || !/^\d{4}-\d{2}$/.test(anoMes) || !tipo) {
    return NextResponse.json({ error: "Informe turmaId, anoMes (YYYY-MM) e tipo" }, { status: 400 });
  }

  const [ano, mes] = anoMes.split("-").map(Number);
  const semanas = semanasDoMes(new Date(Date.UTC(ano, mes - 1, 15)));

  const turma = await prisma.turma.findUnique({ where: { id: turmaId }, select: { nome: true } });
  if (!turma) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });

  const dadosImpressao = impresso ? { impressoEm: new Date(), impressoPor: session.user.name ?? "Usuário" } : { impressoEm: null, impressoPor: null };

  try {
    if (tipo === "PLANEJAMENTO") {
      await prisma.planejamento.updateMany({
        where: { turmaId, semanaInicio: { in: semanas }, status: "APROVADO" },
        data: { impresso, ...dadosImpressao },
      });
    } else if (tipo === "ROTEIRO") {
      await prisma.planejamento.updateMany({
        where: { turmaId, semanaInicio: { in: semanas }, status: "APROVADO" },
        data: { roteiroImpresso: impresso, roteiroImpressoEm: dadosImpressao.impressoEm, roteiroImpressoPor: dadosImpressao.impressoPor },
      });
    } else {
      await prisma.folhaMensal.updateMany({
        where: { turmaId, tipo, semanaInicio: { in: semanas }, status: "APROVADO" },
        data: { impresso, ...dadosImpressao },
      });
    }

    await prisma.logAtividade.create({
      data: {
        acao: `${LABEL[tipo]} de ${turma.nome} (${anoMes}) marcado como ${impresso ? "impresso" : "não impresso"}`,
        entidade: "Impressao",
        entidadeId: `${turmaId}|${tipo}|${anoMes}`,
        usuario: session.user.name ?? "Usuário",
      },
    });

    after(() => {
      avisarMudanca("impressao");
      avisarMudanca("pedagogico");
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
