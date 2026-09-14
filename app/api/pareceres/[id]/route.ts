import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

async function podeEscrever(userId: string, role: string, turmaId: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  const vinculo = await prisma.vinculoPedagogico.findFirst({ where: { userId, turmaId, papel: "REGENTE" } });
  return !!vinculo;
}

/** Detalhe de um ciclo de parecer — turma, texto compartilhado e a lista de
 * alunos com status, pra tela de visão geral da turma nesse período. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const parecer = await prisma.parecer.findUnique({
    where: { id },
    include: {
      turma: { select: { id: true, nome: true } },
      modelo: { select: { id: true, titulo: true } },
      alunos: { include: { aluno: { select: { id: true, nome: true } } }, orderBy: { aluno: { nome: "asc" } } },
    },
  });
  if (!parecer) return NextResponse.json({ error: "Parecer não encontrado" }, { status: 404 });

  return NextResponse.json({
    id: parecer.id,
    periodo: parecer.periodo,
    textoTurma: parecer.textoTurma,
    turma: parecer.turma,
    modelo: parecer.modelo,
    podeEditar: await podeEscrever(session.user.id, session.user.role, parecer.turma.id),
    alunos: parecer.alunos.map((a) => ({ id: a.id, alunoId: a.aluno.id, nome: a.aluno.nome, status: a.status })),
  });
}

/** Salva o texto compartilhado da turma pro ciclo — separado do texto
 * individual de cada aluno (achado real: no .docx entregue é 1 bloco só,
 * igual pra todo mundo daquela turma no período). */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const parecer = await prisma.parecer.findUnique({ where: { id }, select: { turmaId: true } });
  if (!parecer) return NextResponse.json({ error: "Parecer não encontrado" }, { status: 404 });
  if (!(await podeEscrever(session.user.id, session.user.role, parecer.turmaId))) {
    return NextResponse.json({ error: "Só a professora regente dessa turma edita o parecer" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const textoTurma = String(body?.textoTurma ?? "").trim();

  try {
    await prisma.parecer.update({ where: { id }, data: { textoTurma } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
