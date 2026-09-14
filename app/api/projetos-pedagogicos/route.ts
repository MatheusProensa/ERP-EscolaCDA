import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";

/** Confere se quem tá logado pode mexer no(s) projeto(s) pedagógico(s) dessa
 * turma — mesma regra do Planejamento/Parecer: só a REGENTE dela (ou ADMIN). */
async function podeEscrever(userId: string, role: string, turmaId: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  const vinculo = await prisma.vinculoPedagogico.findFirst({ where: { userId, turmaId, papel: "REGENTE" } });
  return !!vinculo;
}

/** Lista os projetos pedagógicos de UMA turma (mais recente primeiro) —
 * histórico completo, não só o ativo, pra dar pra ver o que já foi
 * trabalhado antes. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const turmaId = req.nextUrl.searchParams.get("turmaId");
  if (!turmaId) return NextResponse.json({ error: "Informe turmaId" }, { status: 400 });

  const projetos = await prisma.projetoPedagogico.findMany({
    where: { turmaId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(projetos);
}

/** Abre um novo projeto pedagógico pra turma — a unidade real de
 * planejamento da Educação Infantil (achado real, set/2026: nasce dos
 * interesses/necessidades observados nas crianças, dura o tempo que
 * precisar). Encerra automaticamente o projeto ativo anterior da mesma
 * turma, se houver (só 1 ativo por vez). */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const turmaId = String(body?.turmaId ?? "");
  const nome = String(body?.nome ?? "").trim();
  const campos = {
    interessesObservados: body?.interessesObservados ? String(body.interessesObservados).trim() : null,
    necessidadesObservadas: body?.necessidadesObservadas ? String(body.necessidadesObservadas).trim() : null,
    acoesNarrativasPerguntas: body?.acoesNarrativasPerguntas ? String(body.acoesNarrativasPerguntas).trim() : null,
    intencionalidades: body?.intencionalidades ? String(body.intencionalidades).trim() : null,
    justificativa: body?.justificativa ? String(body.justificativa).trim() : null,
  };

  if (!turmaId) return NextResponse.json({ error: "Informe turmaId" }, { status: 400 });
  if (!nome) return NextResponse.json({ error: "Informe o nome do projeto" }, { status: 400 });
  if (!(await podeEscrever(session.user.id, session.user.role, turmaId))) {
    return NextResponse.json({ error: "Só a professora regente dessa turma cria um projeto pedagógico" }, { status: 403 });
  }

  try {
    const projeto = await prisma.$transaction(async (tx) => {
      await tx.projetoPedagogico.updateMany({ where: { turmaId, ativo: true }, data: { ativo: false } });
      return tx.projetoPedagogico.create({
        data: { turmaId, nome, ...campos, autorId: session.user.id },
      });
    });

    await prisma.logAtividade.create({
      data: {
        acao: `Projeto pedagógico criado (${nome})`,
        entidade: "ProjetoPedagogico",
        entidadeId: projeto.id,
        usuario: session.user.name ?? "Usuário",
      },
    });

    after(() => avisarMudanca("pedagogico"));
    return NextResponse.json(projeto, { status: 201 });
  } catch (err) {
    return erroApi(err);
  }
}
