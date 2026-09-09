import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { data, pesoKg, alturaCm, observacoes } = body;

  if (!data || !pesoKg || !alturaCm) {
    return NextResponse.json({ error: "Data, peso e altura são obrigatórios" }, { status: 400 });
  }
  const pesoNum = Number(pesoKg);
  const alturaNum = Number(alturaCm);
  if (!Number.isFinite(pesoNum) || pesoNum <= 0 || !Number.isFinite(alturaNum) || alturaNum <= 0) {
    return NextResponse.json({ error: "Peso e altura precisam ser números maiores que zero" }, { status: 400 });
  }

  const aluno = await prisma.aluno.findUnique({ where: { id }, select: { id: true, sexo: true, dataNascimento: true } });
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
  // A classificação (IMC por idade) depende do sexo — sem ele cadastrado no
  // Censo, dá pra guardar peso/altura mesmo assim (não trava o lançamento),
  // mas a tela avisa que falta preencher pra classificar direito.
  if (!aluno.sexo) {
    return NextResponse.json(
      { error: "Esse aluno não tem \"Sexo\" preenchido no Censo — complete o cadastro antes de avaliar (a classificação de IMC depende disso)." },
      { status: 400 }
    );
  }

  try {
    const avaliacao = await prisma.avaliacaoNutricional.create({
      data: {
        alunoId: id,
        data: new Date(data),
        pesoKg: pesoNum,
        alturaCm: alturaNum,
        observacoes: observacoes?.trim() || null,
        usuario: session.user.name ?? "Usuário",
      },
    });

    after(() => avisarMudanca("avaliacao-nutricional"));
    return NextResponse.json(avaliacao, { status: 201 });
  } catch (err) {
    return erroApi(err);
  }
}
