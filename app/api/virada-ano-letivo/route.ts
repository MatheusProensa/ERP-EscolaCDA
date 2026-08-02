import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { GESTAO } from "@/lib/permissoes";

type ItemMapeamento = {
  turmaAtualId: string;
  novoNome: string | null; // null = não promove, conclui o ciclo
  novoTurno: "MANHA" | "TARDE" | null;
  novaCapacidade: number | null;
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!GESTAO.includes(session.user.role as (typeof GESTAO)[number])) {
    return NextResponse.json({ error: "Só Admin/Direção pode fazer a virada de ano letivo" }, { status: 403 });
  }

  const body = await req.json();
  const novoAno = Number(body.novoAno);
  const mapeamento = body.mapeamento as ItemMapeamento[];

  if (!novoAno || !Array.isArray(mapeamento) || mapeamento.length === 0) {
    return NextResponse.json({ error: "Informe o novo ano e o mapeamento das turmas" }, { status: 400 });
  }

  const anoLetivoAtual = await prisma.anoLetivo.findFirst({ where: { ativo: true } });
  if (!anoLetivoAtual) return NextResponse.json({ error: "Nenhum ano letivo ativo encontrado" }, { status: 400 });

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const novoAnoLetivo = await tx.anoLetivo.upsert({
        where: { ano: novoAno },
        create: { ano: novoAno, ativo: true },
        update: { ativo: true },
      });
      await tx.anoLetivo.update({ where: { id: anoLetivoAtual.id }, data: { ativo: false } });

      let totalPromovidos = 0;
      let totalConcluidos = 0;

      for (const item of mapeamento) {
        const turmaAtual = await tx.turma.findUnique({ where: { id: item.turmaAtualId } });
        if (!turmaAtual) continue;

        const matriculasAtivas = await tx.matricula.findMany({
          where: { turmaId: item.turmaAtualId, situacao: "ATIVA" },
        });

        let novaTurma = null;
        if (item.novoNome) {
          novaTurma = await tx.turma.upsert({
            where: { nome_anoLetivoId: { nome: item.novoNome, anoLetivoId: novoAnoLetivo.id } },
            create: {
              nome: item.novoNome,
              turno: item.novoTurno ?? turmaAtual.turno,
              capacidade: item.novaCapacidade ?? turmaAtual.capacidade,
              anoLetivoId: novoAnoLetivo.id,
            },
            update: {},
          });
        }

        for (const m of matriculasAtivas) {
          await tx.matricula.update({ where: { id: m.id }, data: { situacao: "CONCLUIDA" } });
          if (novaTurma) {
            await tx.matricula.create({
              data: {
                alunoId: m.alunoId,
                turmaId: novaTurma.id,
                anoLetivoId: novoAnoLetivo.id,
                situacao: "ATIVA",
              },
            });
            totalPromovidos++;
          } else {
            totalConcluidos++;
          }
        }
      }

      await tx.logAtividade.create({
        data: {
          acao: `Virada de ano letivo ${anoLetivoAtual.ano} → ${novoAno}: ${totalPromovidos} promovido(s), ${totalConcluidos} concluído(s)`,
          entidade: "AnoLetivo",
          entidadeId: novoAnoLetivo.id,
          usuario: session.user.name ?? "Usuário",
        },
      });

      return { novoAnoLetivo, totalPromovidos, totalConcluidos };
    });

    return NextResponse.json(resultado);
  } catch (err) {
    return erroApi(err);
  }
}
