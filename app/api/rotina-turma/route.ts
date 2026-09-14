import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";

async function podeEscrever(userId: string, role: string, turmaId: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  const vinculo = await prisma.vinculoPedagogico.findFirst({ where: { userId, turmaId, papel: "REGENTE" } });
  return !!vinculo;
}

/** Sugestão inicial dos momentos da rotina — mesma lista-base do documento
 * real MODELO_PLANEJAMENTO_CDA ("completar conforme sequência de momentos da
 * turma, acrescentar ou retirar conforme turma"). Só usada quando a turma
 * ainda não salvou nada — ponto de partida, não obrigatório. */
const MOMENTOS_SUGERIDOS = [
  "Chegada/Acolhida",
  "Lanche 1",
  "Proposta pedagógica",
  "Lanche 2",
  "Pracinha",
  "Momentos livres",
  "Trocas",
  "Banheiro",
  "Escovação",
  "Soninho",
  "Descanso na sala",
  "Saída/despedida",
];

/** Planejamento do Cotidiano — a rotina fixa da turma (achado real, set/2026,
 * documento MODELO_PLANEJAMENTO_CDA). Diferente do planejamento semanal: não
 * muda toda semana, só quando a rotina em si muda. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const turmaId = req.nextUrl.searchParams.get("turmaId");
  if (!turmaId) return NextResponse.json({ error: "Informe turmaId" }, { status: 400 });

  const salvos = await prisma.momentoRotina.findMany({ where: { turmaId }, orderBy: { ordem: "asc" } });
  const momentos =
    salvos.length > 0
      ? salvos.map((m) => ({ id: m.id, nome: m.nome, descricao: m.descricao }))
      : MOMENTOS_SUGERIDOS.map((nome) => ({ id: null, nome, descricao: "" }));

  return NextResponse.json({
    momentos,
    sugerido: salvos.length === 0,
    podeEditar: await podeEscrever(session.user.id, session.user.role, turmaId),
  });
}

/** Salva a rotina da turma — substitui a lista inteira (upsert simples, ela
 * mexe pouco nisso, não precisa de granularidade maior). */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const turmaId = String(body?.turmaId ?? "");
  const momentos = Array.isArray(body?.momentos) ? body.momentos : [];

  if (!turmaId) return NextResponse.json({ error: "Informe turmaId" }, { status: 400 });
  if (!(await podeEscrever(session.user.id, session.user.role, turmaId))) {
    return NextResponse.json({ error: "Só a professora regente dessa turma edita a rotina" }, { status: 403 });
  }

  const validos = momentos
    .map((m: unknown, i: number) => {
      const obj = m as { nome?: unknown; descricao?: unknown };
      const nome = String(obj?.nome ?? "").trim();
      if (!nome) return null;
      return { ordem: i, nome, descricao: String(obj?.descricao ?? "").trim() };
    })
    .filter((m: unknown): m is { ordem: number; nome: string; descricao: string } => m !== null);

  try {
    await prisma.$transaction([
      prisma.momentoRotina.deleteMany({ where: { turmaId } }),
      prisma.momentoRotina.createMany({
        data: validos.map((m: { ordem: number; nome: string; descricao: string }) => ({ turmaId, ...m })),
      }),
    ]);

    after(() => avisarMudanca("pedagogico"));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
