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

/** Horário fixo das aulas especializadas de uma turma, por dia da semana
 * (0=segunda...4=sexta) — devolve os 5 dias sempre, com texto vazio pro que
 * ainda não foi preenchido. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const turmaId = req.nextUrl.searchParams.get("turmaId");
  if (!turmaId) return NextResponse.json({ error: "Informe turmaId" }, { status: 400 });

  const horarios = await prisma.horarioEspecializada.findMany({ where: { turmaId } });
  const porDia = new Map(horarios.map((h) => [h.diaSemana, h.texto]));
  const dias = [0, 1, 2, 3, 4].map((diaSemana) => ({ diaSemana, texto: porDia.get(diaSemana) ?? "" }));

  return NextResponse.json({ dias, podeEditar: await podeEscrever(session.user.id, session.user.role, turmaId) });
}

/** Salva o horário fixo das especializadas da turma — substitui os 5 dias de
 * uma vez (upsert por dia, apaga o que ficou em branco). Só a regente (ou
 * ADMIN) edita. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const turmaId = String(body?.turmaId ?? "");
  const dias = Array.isArray(body?.dias) ? body.dias : [];

  if (!turmaId) return NextResponse.json({ error: "Informe turmaId" }, { status: 400 });
  if (!(await podeEscrever(session.user.id, session.user.role, turmaId))) {
    return NextResponse.json({ error: "Só a professora regente dessa turma edita o horário de especializadas" }, { status: 403 });
  }

  try {
    await prisma.$transaction(
      dias.flatMap((d: unknown) => {
        const obj = d as { diaSemana?: unknown; texto?: unknown };
        const diaSemana = Number(obj?.diaSemana);
        if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 4) return [];
        const texto = String(obj?.texto ?? "").trim();
        if (!texto) {
          return [prisma.horarioEspecializada.deleteMany({ where: { turmaId, diaSemana } })];
        }
        return [
          prisma.horarioEspecializada.upsert({
            where: { turmaId_diaSemana: { turmaId, diaSemana } },
            create: { turmaId, diaSemana, texto },
            update: { texto },
          }),
        ];
      })
    );

    after(() => avisarMudanca("pedagogico"));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
