import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { validarUploadDataUri } from "@/lib/validarUpload";
import { avisarMudanca } from "@/lib/liveUpdate";

async function podeEscrever(userId: string, role: string, turmaId: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  const vinculo = await prisma.vinculoPedagogico.findFirst({ where: { userId, turmaId, papel: "REGENTE" } });
  return !!vinculo;
}

/** Lista os itens do portfólio de 1 aluno, mais recentes primeiro — a linha
 * do tempo visual (foto + legenda) confirmada como boa ideia, out/2026. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const alunoId = req.nextUrl.searchParams.get("alunoId");
  if (!alunoId) return NextResponse.json({ error: "Informe alunoId" }, { status: 400 });

  const itens = await prisma.portfolioItem.findMany({
    where: { alunoId },
    orderBy: { createdAt: "desc" },
    select: { id: true, foto: true, legenda: true, createdAt: true },
  });
  return NextResponse.json(itens);
}

/** Adiciona uma foto ao portfólio do aluno — pedido explícito do dono
 * (out/2026): "anexar fotos do portfólio precisa ser bem intuitivo". Só a
 * regente da turma daquele aluno agora (mesma regra do Planejamento/Parecer). */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const alunoId = String(body?.alunoId ?? "");
  const turmaId = String(body?.turmaId ?? "");
  const foto = body?.foto;
  const legenda = body?.legenda ? String(body.legenda).trim() : null;

  if (!alunoId || !turmaId) return NextResponse.json({ error: "Informe aluno e turma" }, { status: 400 });
  if (!(await podeEscrever(session.user.id, session.user.role, turmaId))) {
    return NextResponse.json({ error: "Só a professora regente dessa turma adiciona fotos ao portfólio" }, { status: 403 });
  }

  const validacao = validarUploadDataUri(foto);
  if (!validacao.ok) return NextResponse.json({ error: validacao.erro }, { status: 400 });

  const aluno = await prisma.aluno.findUnique({ where: { id: alunoId }, select: { id: true } });
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  try {
    const item = await prisma.portfolioItem.create({
      data: { alunoId, turmaId, foto, legenda, autorId: session.user.id },
      select: { id: true, foto: true, legenda: true, createdAt: true },
    });

    after(() => avisarMudanca("pedagogico"));
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    return erroApi(err);
  }
}
