import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";
import { segundaFeiraDe, diasDaSemana, isoData } from "@/lib/planejamento";

/** Confere se quem tá logado pode ESCREVER o planejamento dessa turma — hoje
 * só a REGENTE dela (ou ADMIN). Especialista escrever planejamento da
 * própria matéria ainda não foi confirmado com o dono, fica de fora por
 * enquanto (ver task #18). */
async function podeEscrever(userId: string, role: string, turmaId: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  const vinculo = await prisma.vinculoPedagogico.findFirst({ where: { userId, turmaId, papel: "REGENTE" } });
  return !!vinculo;
}

/** Busca o planejamento de uma turma numa semana específica (normalizada pra
 * segunda-feira) — devolve os 5 dias sempre, com conteúdo vazio pros que
 * ainda não foram preenchidos, pra o formulário não precisar tratar "não
 * existe ainda" como caso especial. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const turmaId = req.nextUrl.searchParams.get("turmaId");
  const semanaParam = req.nextUrl.searchParams.get("semana");
  if (!turmaId || !semanaParam) {
    return NextResponse.json({ error: "Informe turmaId e semana" }, { status: 400 });
  }
  const semana = new Date(`${semanaParam}T00:00:00.000Z`);
  if (Number.isNaN(semana.getTime())) return NextResponse.json({ error: "Semana inválida" }, { status: 400 });
  const semanaInicio = segundaFeiraDe(semana);

  const planejamento = await prisma.planejamento.findUnique({
    where: { turmaId_semanaInicio: { turmaId, semanaInicio } },
    include: { dias: true, tema: { select: { id: true, titulo: true, estrutura: true } } },
  });

  const diasPorData = new Map((planejamento?.dias ?? []).map((d) => [isoData(d.data), d.conteudo]));
  const dias = diasDaSemana(semanaInicio).map((data) => ({ data: isoData(data), conteudo: diasPorData.get(isoData(data)) ?? "" }));

  return NextResponse.json({
    semanaInicio: isoData(semanaInicio),
    temaId: planejamento?.temaId ?? null,
    tema: planejamento?.tema ?? null,
    dias,
    podeEditar: await podeEscrever(session.user.id, session.user.role, turmaId),
  });
}

/** Salva (cria ou substitui) o planejamento de uma turma numa semana — o
 * front sempre manda os 5 dias completos, então é upsert simples seguido de
 * substituir os PlanejamentoDia numa transação. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const turmaId = String(body?.turmaId ?? "");
  const semanaParam = String(body?.semana ?? "");
  const temaId = body?.temaId ? String(body.temaId) : null;
  const dias = Array.isArray(body?.dias) ? body.dias : [];

  if (!turmaId || !semanaParam) return NextResponse.json({ error: "Informe turmaId e semana" }, { status: 400 });
  const semana = new Date(`${semanaParam}T00:00:00.000Z`);
  if (Number.isNaN(semana.getTime())) return NextResponse.json({ error: "Semana inválida" }, { status: 400 });
  const semanaInicio = segundaFeiraDe(semana);

  if (!(await podeEscrever(session.user.id, session.user.role, turmaId))) {
    return NextResponse.json({ error: "Só a professora regente dessa turma edita o planejamento" }, { status: 403 });
  }

  const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
  if (!turma) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });

  if (temaId) {
    const tema = await prisma.temaPlanejamento.findUnique({ where: { id: temaId } });
    if (!tema) return NextResponse.json({ error: "Tema não encontrado" }, { status: 400 });
  }

  const diasValidos: { data: Date; conteudo: string }[] = [];
  for (const d of dias) {
    const data = new Date(`${d?.data}T00:00:00.000Z`);
    if (Number.isNaN(data.getTime())) continue;
    diasValidos.push({ data, conteudo: String(d?.conteudo ?? "").trim() });
  }

  try {
    const planejamento = await prisma.$transaction(async (tx) => {
      const registro = await tx.planejamento.upsert({
        where: { turmaId_semanaInicio: { turmaId, semanaInicio } },
        create: { turmaId, semanaInicio, temaId, autorId: session.user.id },
        update: { temaId, autorId: session.user.id },
      });
      await tx.planejamentoDia.deleteMany({ where: { planejamentoId: registro.id } });
      await tx.planejamentoDia.createMany({
        data: diasValidos
          .filter((d) => d.conteudo)
          .map((d) => ({ planejamentoId: registro.id, data: d.data, conteudo: d.conteudo })),
      });
      return registro;
    });

    await prisma.logAtividade.create({
      data: {
        acao: `Planejamento da semana de ${isoData(semanaInicio)} salvo (${turma.nome})`,
        entidade: "Planejamento",
        entidadeId: planejamento.id,
        usuario: session.user.name ?? "Usuário",
      },
    });

    after(() => avisarMudanca("pedagogico"));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
