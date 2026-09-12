import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";

const STATUS = [
  "SEM_RESPOSTA",
  "CONFIRMADO_AGENDA",
  "CONFIRMADO_FORMS",
  "NAO_DEU_RETORNO",
  "NAO_IRAO",
  "VAO_SE_MUDAR",
] as const;

/** Upsert — a tela nunca sabe se já existe uma linha pra esse (evento, aluno)
 * ou se é a primeira resposta registrada, então trata os dois casos igual. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; alunoId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id: eventoId, alunoId } = await params;
  const body = await req.json();
  const { status, adultos, criancas, horario, compareceu, observacao } = body;

  if (status !== undefined && !STATUS.includes(status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }

  try {
    const confirmacao = await prisma.confirmacaoFestaFamilia.upsert({
      where: { eventoId_alunoId: { eventoId, alunoId } },
      create: {
        eventoId,
        alunoId,
        status: status || "SEM_RESPOSTA",
        adultos: adultos ?? null,
        criancas: criancas ?? null,
        horario: horario?.trim() || null,
        compareceu: compareceu ?? null,
        observacao: observacao?.trim() || null,
      },
      update: {
        status: status || undefined,
        adultos: adultos !== undefined ? adultos : undefined,
        criancas: criancas !== undefined ? criancas : undefined,
        horario: horario !== undefined ? horario?.trim() || null : undefined,
        compareceu: compareceu !== undefined ? compareceu : undefined,
        observacao: observacao !== undefined ? observacao?.trim() || null : undefined,
      },
    });
    after(() => avisarMudanca("festa-familia"));
    return NextResponse.json(confirmacao);
  } catch (err) {
    return erroApi(err);
  }
}
