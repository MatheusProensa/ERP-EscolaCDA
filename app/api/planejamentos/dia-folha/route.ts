import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";
import { segundaFeiraDe, tipoPadraoDoDia, type ConteudoDiaPlanejamento } from "@/lib/planejamento";

/// Mesma regra de escrita do Planejamento — só a regente da turma (ou ADMIN).
async function podeEscrever(userId: string, role: string, turmaId: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  const vinculo = await prisma.vinculoPedagogico.findFirst({ where: { userId, turmaId, papel: "REGENTE" } });
  return !!vinculo;
}

/** Salva só o parágrafo de UM dia de uma folha imprimível (Atividade
 * Gráfica/Tema Literário) — pedido do dono, set/2026: as abas próprias de
 * cada documento não devem mexer em mais nada do Planejamento daquela
 * semana (título, momentos, materiais...). Por isso não reusa o POST
 * /api/planejamentos (que reescreve a semana inteira) — faz um merge
 * cirúrgico só na chave certa do conteúdo daquele dia, criando o
 * Planejamento/PlanejamentoDia por baixo se ainda não existirem. */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const turmaId = String(body?.turmaId ?? "");
  const dataParam = String(body?.data ?? "");
  const tipo = body?.tipo === "TEMA_LITERARIO" ? "TEMA_LITERARIO" : body?.tipo === "ATIVIDADE_GRAFICA" ? "ATIVIDADE_GRAFICA" : null;
  const texto = typeof body?.texto === "string" ? body.texto.trim() : "";
  if (!turmaId || !dataParam || !tipo) {
    return NextResponse.json({ error: "Informe turmaId, data e tipo (TEMA_LITERARIO ou ATIVIDADE_GRAFICA)" }, { status: 400 });
  }
  const data = new Date(`${dataParam}T00:00:00.000Z`);
  if (Number.isNaN(data.getTime())) return NextResponse.json({ error: "Data inválida" }, { status: 400 });

  if (!(await podeEscrever(session.user.id, session.user.role, turmaId))) {
    return NextResponse.json({ error: "Só a professora regente dessa turma edita essa folha" }, { status: 403 });
  }

  const semanaInicio = segundaFeiraDe(data);
  const indiceSemana = Math.round((data.getTime() - semanaInicio.getTime()) / 86400000);
  const chave: keyof ConteudoDiaPlanejamento = tipo === "TEMA_LITERARIO" ? "folhaTemaLiterario" : "folhaAtividadeGrafica";

  try {
    const planejamento = await prisma.planejamento.upsert({
      where: { turmaId_semanaInicio: { turmaId, semanaInicio } },
      create: { turmaId, semanaInicio, autorId: session.user.id },
      update: {},
    });

    const diaExistente = await prisma.planejamentoDia.findUnique({
      where: { planejamentoId_data: { planejamentoId: planejamento.id, data } },
    });
    const conteudo = { ...((diaExistente?.conteudo ?? {}) as ConteudoDiaPlanejamento) };
    if (texto) conteudo[chave] = texto;
    else delete conteudo[chave];

    await prisma.planejamentoDia.upsert({
      where: { planejamentoId_data: { planejamentoId: planejamento.id, data } },
      create: { planejamentoId: planejamento.id, data, tipo: diaExistente?.tipo ?? tipoPadraoDoDia(indiceSemana), conteudo },
      update: { conteudo },
    });

    after(() => avisarMudanca("pedagogico"));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
