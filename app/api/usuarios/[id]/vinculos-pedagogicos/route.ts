import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { acessoPermitido } from "@/lib/permissoes";
import { avisarMudanca } from "@/lib/liveUpdate";

const PAPEIS_VALIDOS = new Set(["REGENTE", "ESPECIALISTA"]);

/** Salva os vínculos de uma professora com turmas na Área Pedagógica — REGENTE
 * (dona da turma inteira) ou ESPECIALISTA (matéria específica, podendo cobrir
 * várias turmas). Mesmo padrão de /api/usuarios/[id]/permissoes: o front manda
 * o conjunto inteiro de vínculos dessa pessoa, a rota substitui tudo de uma vez
 * numa transação (mais simples que diffar upsert/delete linha a linha, já que
 * a matéria pode mudar pra uma turma que já tinha vínculo). */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!acessoPermitido(req.nextUrl.pathname, req.method, session.user.role, session.user.permissoes)) {
    return NextResponse.json({ error: "Sem permissão para este setor" }, { status: 403 });
  }

  const { id } = await params;
  const alvo = await prisma.user.findUnique({ where: { id } });
  if (!alvo) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const vinculos = body?.vinculos;
  if (!Array.isArray(vinculos)) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  for (const v of vinculos) {
    if (!v?.turmaId || typeof v.turmaId !== "string") {
      return NextResponse.json({ error: "Turma inválida" }, { status: 400 });
    }
    if (!PAPEIS_VALIDOS.has(v.papel)) {
      return NextResponse.json({ error: "Papel inválido" }, { status: 400 });
    }
    if (v.papel === "ESPECIALISTA" && !String(v.materia ?? "").trim()) {
      return NextResponse.json({ error: "Informe a matéria da especialista" }, { status: 400 });
    }
  }

  const turmaIds: string[] = vinculos.map((v) => v.turmaId);
  if (turmaIds.length) {
    const encontradas = await prisma.turma.count({ where: { id: { in: turmaIds } } });
    if (encontradas !== new Set(turmaIds).size) {
      return NextResponse.json({ error: "Alguma turma não foi encontrada" }, { status: 400 });
    }
  }

  try {
    await prisma.$transaction([
      prisma.vinculoPedagogico.deleteMany({ where: { userId: id } }),
      ...vinculos.map((v) =>
        prisma.vinculoPedagogico.create({
          data: {
            userId: id,
            turmaId: v.turmaId,
            papel: v.papel,
            materia: v.papel === "ESPECIALISTA" ? String(v.materia).trim() : null,
          },
        })
      ),
    ]);

    await prisma.logAtividade.create({
      data: {
        acao: `Vínculos pedagógicos de ${alvo.name} atualizados`,
        entidade: "Usuario",
        entidadeId: id,
        usuario: session.user.name ?? "Usuário",
      },
    });

    after(() => avisarMudanca("usuarios"));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
