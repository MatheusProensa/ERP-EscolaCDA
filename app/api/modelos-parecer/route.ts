import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";

/** Modelos de parecer (lista de parágrafos guiados) — qualquer um do
 * Pedagógico lê pra escolher na hora de abrir um novo ciclo de parecer, só a
 * coordenadora cria (mesmo padrão de /api/temas-planejamento). */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const modelos = await prisma.modeloParecer.findMany({
    orderBy: { titulo: "asc" },
    include: { paragrafos: { orderBy: { ordem: "asc" } } },
  });
  return NextResponse.json(modelos);
}

/** Cadastro de um modelo de parecer com sua lista de parágrafos — achado real
 * (out/2026): os PDFs de orientação da escola já têm exatamente esse
 * formato, Conteúdo + Pergunta Norteadora por parágrafo, mudando por
 * público/etapa. Aqui a coordenação monta isso 1 vez por modelo, em vez de
 * mandar um PDF separado pras professoras abrirem do lado. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.user.role !== "ADMIN" && !session.user.coordenaAreaPedagogica) {
    return NextResponse.json({ error: "Só a coordenadora da Área Pedagógica cadastra modelos de parecer" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const titulo = String(body?.titulo ?? "").trim();
  const paragrafos = Array.isArray(body?.paragrafos) ? body.paragrafos : [];

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
