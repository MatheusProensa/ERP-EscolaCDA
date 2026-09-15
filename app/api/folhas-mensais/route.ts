import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";
import { criarNotificacao } from "@/lib/notificacoes";
import { segundaFeiraDe, isoData } from "@/lib/planejamento";

async function podeEscrever(userId: string, role: string, turmaId: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  const vinculo = await prisma.vinculoPedagogico.findFirst({ where: { userId, turmaId, papel: "REGENTE" } });
  return !!vinculo;
}

const TIPOS = ["ATIVIDADE_GRAFICA", "TEMA_LITERARIO"] as const;
type Tipo = (typeof TIPOS)[number];

/** Envelope de status (Rascunho/Enviado/Aprovado/Devolvido) da Atividade
 * Gráfica/Tema Literário de uma semana — mesmo fluxo real do Planejamento
 * (pedido do dono, set/2026), só que num registro à parte (FolhaMensal),
 * já que o texto de cada dia mora em PlanejamentoDia e os 2 documentos
 * evoluem separados um do outro e do Planejamento. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const turmaId = req.nextUrl.searchParams.get("turmaId");
  const tipoParam = req.nextUrl.searchParams.get("tipo");
  const semanaParam = req.nextUrl.searchParams.get("semana");
  if (!turmaId || !semanaParam || !TIPOS.includes(tipoParam as Tipo)) {
    return NextResponse.json({ error: "Informe turmaId, tipo e semana" }, { status: 400 });
  }
  const tipo = tipoParam as Tipo;
  const semana = new Date(`${semanaParam}T00:00:00.000Z`);
  if (Number.isNaN(semana.getTime())) return NextResponse.json({ error: "Semana inválida" }, { status: 400 });
  const semanaInicio = segundaFeiraDe(semana);

  const folha = await prisma.folhaMensal.findUnique({
    where: { turmaId_tipo_semanaInicio: { turmaId, tipo, semanaInicio } },
    include: { comentarioAutor: { select: { name: true } } },
  });

  return NextResponse.json({
    id: folha?.id ?? null,
    status: folha?.status ?? "RASCUNHO",
    comentarioCoordenadora: folha?.comentarioCoordenadora ?? "",
    comentarioAutorNome: folha?.comentarioAutor?.name ?? "",
    comentarioEm: folha?.comentarioEm?.toISOString() ?? null,
    liComentarioEm: folha?.liComentarioEm?.toISOString() ?? null,
    podeEditar: await podeEscrever(session.user.id, session.user.role, turmaId),
    souCoordenadora: session.user.role === "ADMIN" || !!session.user.coordenaAreaPedagogica,
  });
}

/** Muda o status (Finalizar/Reabrir/Reenviar) — o texto dos dias é salvo à
 * parte, em /api/planejamentos/dia-folha, antes de chamar isso aqui. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const turmaId = String(body?.turmaId ?? "");
  const tipo = TIPOS.includes(body?.tipo) ? (body.tipo as Tipo) : null;
  const semanaParam = String(body?.semana ?? "");
  const status = body?.status === "ENVIADO" ? "ENVIADO" : body?.status === "RASCUNHO" ? "RASCUNHO" : null;
  if (!turmaId || !tipo || !semanaParam || !status) {
    return NextResponse.json({ error: "Informe turmaId, tipo, semana e status" }, { status: 400 });
  }
  const semana = new Date(`${semanaParam}T00:00:00.000Z`);
  if (Number.isNaN(semana.getTime())) return NextResponse.json({ error: "Semana inválida" }, { status: 400 });
  const semanaInicio = segundaFeiraDe(semana);

  if (!(await podeEscrever(session.user.id, session.user.role, turmaId))) {
    return NextResponse.json({ error: "Só a professora regente dessa turma edita essa folha" }, { status: 403 });
  }

  const turma = await prisma.turma.findUnique({ where: { id: turmaId }, select: { nome: true } });
  if (!turma) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });

  const existente = await prisma.folhaMensal.findUnique({
    where: { turmaId_tipo_semanaInicio: { turmaId, tipo, semanaInicio } },
    select: { status: true },
  });
  // Reenvio depois de devolvido — mesmo padrão do Planejamento: limpa o
  // comentário antigo e avisa quem coordena.
  const reenvioAposDevolucao = existente?.status === "DEVOLVIDO" && status === "ENVIADO";

  try {
    const folha = await prisma.folhaMensal.upsert({
      where: { turmaId_tipo_semanaInicio: { turmaId, tipo, semanaInicio } },
      create: { turmaId, tipo, semanaInicio, status, autorId: session.user.id },
      update: {
        status,
        autorId: session.user.id,
        ...(reenvioAposDevolucao ? { comentarioCoordenadora: null, comentarioAutorId: null, comentarioEm: null, liComentarioEm: null } : {}),
      },
    });

    if (reenvioAposDevolucao) {
      const coordenadoras = await prisma.user.findMany({ where: { coordenaAreaPedagogica: true }, select: { id: true } });
      const nomeDoc = tipo === "TEMA_LITERARIO" ? "Tema Literário" : "Atividade Gráfica";
      await Promise.all(
        coordenadoras.map((c) =>
          criarNotificacao({
            usuarioId: c.id,
            tipo: "FOLHA_MENSAL_REENVIADA",
            titulo: `${turma.nome} reenviou ${nomeDoc}`,
            corpo: `Semana de ${isoData(semanaInicio)}, depois de devolvido pra revisão.`,
            link: `/pedagogico/planejamento/${turmaId}/${tipo === "TEMA_LITERARIO" ? "tema-literario" : "atividade-grafica"}`,
          })
        )
      );
    }

    after(() => avisarMudanca("pedagogico"));
    return NextResponse.json({ id: folha.id, status: folha.status });
  } catch (err) {
    return erroApi(err);
  }
}
