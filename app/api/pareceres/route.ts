import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";

/** Confere se quem tá logado pode ABRIR/editar o parecer dessa turma — mesma
 * regra do Planejamento: só a REGENTE (ou ADMIN). Especialista escrever a
 * própria seção ainda não foi confirmado com o dono (task #18, pergunta em
 * aberto), fica de fora por enquanto. */
async function podeEscrever(userId: string, role: string, turmaId: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  const vinculo = await prisma.vinculoPedagogico.findFirst({ where: { userId, turmaId, papel: "REGENTE" } });
  return !!vinculo;
}

/** Lista os ciclos de parecer (ex.: "1º Trimestre 2026") já abertos pra uma
 * turma, com um resumo de quantos alunos já foram enviados. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const turmaId = req.nextUrl.searchParams.get("turmaId");
  if (!turmaId) return NextResponse.json({ error: "Informe turmaId" }, { status: 400 });

  const pareceres = await prisma.parecer.findMany({
    where: { turmaId },
    orderBy: { createdAt: "desc" },
    include: { modelo: { select: { titulo: true } }, alunos: { select: { status: true } } },
  });

  return NextResponse.json(
    pareceres.map((p) => ({
      id: p.id,
      periodo: p.periodo,
      modeloTitulo: p.modelo.titulo,
      total: p.alunos.length,
      enviados: p.alunos.filter((a) => a.status === "ENVIADO").length,
    }))
  );
}

/** Abre um novo ciclo de parecer pra uma turma — cria 1 ParecerAluno pra cada
 * aluno com matrícula ATIVA nela agora (achado real: é isso que a
 * coordenadora faz manualmente hoje, criando 1 arquivo por aluno na pasta do
 * trimestre/semestre). */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const turmaId = String(body?.turmaId ?? "");
  const modeloId = String(body?.modeloId ?? "");
  const periodo = String(body?.periodo ?? "").trim();

  if (!turmaId || !modeloId || !periodo) {
    return NextResponse.json({ error: "Informe turma, modelo e período" }, { status: 400 });
  }
  if (!(await podeEscrever(session.user.id, session.user.role, turmaId))) {
    return NextResponse.json({ error: "Só a professora regente dessa turma abre um novo ciclo de parecer" }, { status: 403 });
  }

  const modelo = await prisma.modeloParecer.findUnique({ where: { id: modeloId } });
  if (!modelo) return NextResponse.json({ error: "Modelo não encontrado" }, { status: 400 });

  const matriculas = await prisma.matricula.findMany({
    where: { turmaId, situacao: "ATIVA" },
    select: { alunoId: true },
  });
  if (matriculas.length === 0) {
    return NextResponse.json({ error: "Essa turma não tem nenhum aluno com matrícula ativa" }, { status: 400 });
  }

  try {
    const parecer = await prisma.parecer.create({
      data: {
        turmaId,
        modeloId,
        periodo,
        autorId: session.user.id,
        alunos: { create: matriculas.map((m) => ({ alunoId: m.alunoId })) },
      },
    });

    await prisma.logAtividade.create({
      data: {
        acao: `Parecer aberto (${periodo}) — ${matriculas.length} aluno(s)`,
        entidade: "Parecer",
        entidadeId: parecer.id,
        usuario: session.user.name ?? "Usuário",
      },
    });

    after(() => avisarMudanca("pedagogico"));
    return NextResponse.json(parecer, { status: 201 });
  } catch (err) {
    return erroApi(err);
  }
}
