import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";

/** Confere se quem tá logado pode mexer no modelo de parecer dessa turma —
 * mesma regra do Planejamento/Parecer: só a REGENTE dela (ou ADMIN), já que o
 * modelo agora é por turma, não mais um catálogo global da coordenação. */
async function podeEscrever(userId: string, role: string, turmaId: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  const vinculo = await prisma.vinculoPedagogico.findFirst({ where: { userId, turmaId, papel: "REGENTE" } });
  return !!vinculo;
}

/** Modelos de parecer de UMA turma (lista de parágrafos guiados) — escopado
 * por turmaId desde a correção do dono (set/2026: "do parecer tbm, deveria
 * ser em cada turma"). */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const turmaId = req.nextUrl.searchParams.get("turmaId");
  if (!turmaId) return NextResponse.json({ error: "Informe turmaId" }, { status: 400 });

  const modelos = await prisma.modeloParecer.findMany({
    where: { turmaId },
    orderBy: { titulo: "asc" },
    include: { paragrafos: { orderBy: { ordem: "asc" } } },
  });
  return NextResponse.json(modelos);
}

/** Cadastro de um modelo de parecer com sua lista de parágrafos — achado real
 * (out/2026): os PDFs de orientação da escola já têm exatamente esse
 * formato, Conteúdo + Pergunta Norteadora por parágrafo, mudando por
 * público/etapa/turma. Quem monta é a própria regente da turma (ou ADMIN),
 * não mais uma coordenação central. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const turmaId = String(body?.turmaId ?? "");
  const titulo = String(body?.titulo ?? "").trim();
  const paragrafos = Array.isArray(body?.paragrafos) ? body.paragrafos : [];

  if (!turmaId) return NextResponse.json({ error: "Informe turmaId" }, { status: 400 });
  if (!(await podeEscrever(session.user.id, session.user.role, turmaId))) {
    return NextResponse.json({ error: "Só a professora regente dessa turma cadastra modelos de parecer" }, { status: 403 });
  }

  if (!titulo) return NextResponse.json({ error: "Informe o título do modelo" }, { status: 400 });
  const paragrafosValidos = paragrafos
    .map((p: unknown, i: number) => {
      const obj = p as { titulo?: unknown; perguntaNorteadora?: unknown };
      const t = String(obj?.titulo ?? "").trim();
      if (!t) return null;
      return { ordem: i, titulo: t, perguntaNorteadora: obj?.perguntaNorteadora ? String(obj.perguntaNorteadora).trim() : null };
    })
    .filter((p: unknown): p is { ordem: number; titulo: string; perguntaNorteadora: string | null } => p !== null);
  if (paragrafosValidos.length === 0) {
    return NextResponse.json({ error: "Adicione pelo menos 1 parágrafo" }, { status: 400 });
  }

  try {
    const modelo = await prisma.modeloParecer.create({
      data: {
        titulo,
        turmaId,
        criadoPorId: session.user.id,
        paragrafos: { create: paragrafosValidos },
      },
      include: { paragrafos: { orderBy: { ordem: "asc" } } },
    });

    await prisma.logAtividade.create({
      data: {
        acao: `Modelo de parecer criado (${titulo})`,
        entidade: "ModeloParecer",
        entidadeId: modelo.id,
        usuario: session.user.name ?? "Usuário",
      },
    });

    after(() => avisarMudanca("pedagogico"));
    return NextResponse.json(modelo, { status: 201 });
  } catch (err) {
    return erroApi(err);
  }
}
