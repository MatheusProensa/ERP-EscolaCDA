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

/** Parecer individual de 1 aluno — os parágrafos guiados (um por
 * ParagrafoModeloParecer do modelo escolhido pro ciclo) + o status de
 * entrega. Nome/turma vêm do cadastro, não são digitados aqui (achado real:
 * era exatamente isso que gerava erro de digitação nos arquivos manuais). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; alunoId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id, alunoId } = await params;
  const parecerAluno = await prisma.parecerAluno.findUnique({
    where: { parecerId_alunoId: { parecerId: id, alunoId } },
    include: {
      aluno: { select: { nome: true } },
      parecer: { include: { turma: { select: { id: true, nome: true } }, modelo: { include: { paragrafos: { orderBy: { ordem: "asc" } } } } } },
      paragrafos: true,
    },
  });
  if (!parecerAluno) return NextResponse.json({ error: "Parecer não encontrado" }, { status: 404 });

  const conteudoPorParagrafo = new Map(parecerAluno.paragrafos.map((p) => [p.paragrafoId, p.conteudo]));

  return NextResponse.json({
    alunoNome: parecerAluno.aluno.nome,
    turmaNome: parecerAluno.parecer.turma.nome,
    periodo: parecerAluno.parecer.periodo,
    status: parecerAluno.status,
    podeEditar: await podeEscrever(session.user.id, session.user.role, parecerAluno.parecer.turma.id),
    paragrafos: parecerAluno.parecer.modelo.paragrafos.map((p) => ({
      id: p.id,
      titulo: p.titulo,
      perguntaNorteadora: p.perguntaNorteadora,
      conteudo: conteudoPorParagrafo.get(p.id) ?? "",
    })),
  });
}

/** Salva os parágrafos preenchidos e/ou muda o status (rascunho/enviado). */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; alunoId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id, alunoId } = await params;
  const parecerAluno = await prisma.parecerAluno.findUnique({
    where: { parecerId_alunoId: { parecerId: id, alunoId } },
    include: { parecer: { select: { turmaId: true } } },
  });
  if (!parecerAluno) return NextResponse.json({ error: "Parecer não encontrado" }, { status: 404 });
  if (!(await podeEscrever(session.user.id, session.user.role, parecerAluno.parecer.turmaId))) {
    return NextResponse.json({ error: "Só a professora regente dessa turma edita o parecer" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const paragrafos = Array.isArray(body?.paragrafos) ? body.paragrafos : [];
  const status = body?.status === "ENVIADO" ? "ENVIADO" : body?.status === "RASCUNHO" ? "RASCUNHO" : undefined;

  try {
    await prisma.$transaction([
      ...paragrafos
        .filter((p: { id?: unknown }) => typeof p?.id === "string")
        .map((p: { id: string; conteudo?: unknown }) =>
          prisma.parecerAlunoParagrafo.upsert({
            where: { parecerAlunoId_paragrafoId: { parecerAlunoId: parecerAluno.id, paragrafoId: p.id } },
            create: { parecerAlunoId: parecerAluno.id, paragrafoId: p.id, conteudo: String(p.conteudo ?? "").trim() },
            update: { conteudo: String(p.conteudo ?? "").trim() },
          })
        ),
      ...(status ? [prisma.parecerAluno.update({ where: { id: parecerAluno.id }, data: { status } })] : []),
    ]);

    after(() => avisarMudanca("pedagogico"));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
