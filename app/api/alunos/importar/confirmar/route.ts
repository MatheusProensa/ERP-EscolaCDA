import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import type { Diff } from "@/lib/importarAlunos";

const CAMPOS_RESPONSAVEL = ["telefone", "cpf", "endereco", "email"] as const;

/** Aplica só as alterações que o usuário marcou na tela de pré-visualização
 * (app/api/alunos/importar não grava nada sozinho). Reconfere cada item contra
 * o banco antes de gravar — não confia cegamente no que veio do client. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = await req.json();
    const diffs: Diff[] = Array.isArray(body?.diffs) ? body.diffs : [];
    if (diffs.length === 0) return NextResponse.json({ error: "Nenhuma alteração selecionada." }, { status: 400 });
    if (diffs.length > 1000) return NextResponse.json({ error: "Muitos itens de uma vez." }, { status: 400 });

    let aplicados = 0;

    await prisma.$transaction(async (tx) => {
      for (const diff of diffs) {
        if (diff?.tipo === "matricula" && diff.campo === "valorMensalidade") {
          const valor = Number(diff.novo);
          if (!Number.isFinite(valor) || valor <= 0) continue;
          const matricula = await tx.matricula.findUnique({ where: { id: diff.matriculaId } });
          if (!matricula) continue;
          await tx.matricula.update({ where: { id: diff.matriculaId }, data: { valorMensalidade: valor } });
          aplicados++;
        } else if (diff?.tipo === "responsavel" && CAMPOS_RESPONSAVEL.includes(diff.campo)) {
          const novo = String(diff.novo ?? "").trim();
          if (!novo) continue;
          const responsavel = await tx.responsavel.findUnique({ where: { id: diff.responsavelId } });
          if (!responsavel) continue;
          await tx.responsavel.update({ where: { id: diff.responsavelId }, data: { [diff.campo]: novo } });
          aplicados++;
        }
      }

      if (aplicados > 0) {
        await tx.logAtividade.create({
          data: {
            acao: `Importação de planilha aplicou ${aplicados} alteração(ões)`,
            entidade: "Aluno",
            entidadeId: "importacao",
            usuario: session.user.name ?? "Usuário",
          },
        });
      }
    });

    return NextResponse.json({ aplicados });
  } catch (err) {
    return erroApi(err);
  }
}
