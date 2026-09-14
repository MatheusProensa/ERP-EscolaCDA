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

/** Edita os campos de um projeto pedagógico já aberto — achado real: os
 * interesses/necessidades observados vão sendo complementados ao longo do
 * projeto, não é preenchido tudo de uma vez só na abertura. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;

  const projeto = await prisma.projetoPedagogico.findUnique({ where: { id } });
  if (!projeto) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
  if (!(await podeEscrever(session.user.id, session.user.role, projeto.turmaId))) {
    return NextResponse.json({ error: "Só a professora regente dessa turma edita o projeto" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const nome = body?.nome !== undefined ? String(body.nome).trim() : undefined;
  if (nome === "") return NextResponse.json({ error: "Informe o nome do projeto" }, { status: 400 });

  const campoTexto = (chave: string) => (body?.[chave] !== undefined ? String(body[chave]).trim() || null : undefined);

  try {
    const atualizado = await prisma.projetoPedagogico.update({
      where: { id },
      data: {
        ...(nome !== undefined ? { nome } : {}),
        interessesObservados: campoTexto("interessesObservados"),
        necessidadesObservadas: campoTexto("necessidadesObservadas"),
        acoesNarrativasPerguntas: campoTexto("acoesNarrativasPerguntas"),
        intencionalidades: campoTexto("intencionalidades"),
        justificativa: campoTexto("justificativa"),
      },
    });

    after(() => avisarMudanca("pedagogico"));
    return NextResponse.json(atualizado);
  } catch (err) {
    return erroApi(err);
  }
}
