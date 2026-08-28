import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { salvarRegistrosDoMes } from "@/lib/pontoWrite";
import type { RegistroImportado } from "@/lib/importarPonto";

/** Aplica de verdade a importação de Ponto pré-visualizada em .../importar —
 * substitui, mês a mês, os dias que vieram na planilha (mesma semântica do
 * "Salvar" da tela de lançamento manual). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ funcionarioId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { funcionarioId } = await params;
    const funcionario = await prisma.funcionario.findUnique({ where: { id: funcionarioId } });
    if (!funcionario) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });

    const body = await req.json();
    const registros: RegistroImportado[] = Array.isArray(body?.registros) ? body.registros : [];
    if (registros.length === 0) return NextResponse.json({ error: "Nenhum dia pra importar." }, { status: 400 });
    if (registros.length > 400) return NextResponse.json({ error: "Muitos dias de uma vez." }, { status: 400 });

    const porMes = new Map<string, RegistroImportado[]>();
    for (const r of registros) {
      const [ano, mes] = r.data.split("-").map(Number);
      const chave = `${ano}-${mes}`;
      const lista = porMes.get(chave) ?? [];
      lista.push(r);
      porMes.set(chave, lista);
    }

    // Cada mês precisa da lista COMPLETA de dias já lançados + os novos, senão
    // salvarRegistrosDoMes (que substitui o mês inteiro) apaga o que não veio
    // nesta planilha mas já estava certo no sistema.
    for (const [chave, registrosDoMes] of porMes) {
      const [ano, mes] = chave.split("-").map(Number);
      const inicio = new Date(Date.UTC(ano, mes - 1, 1));
      const fim = new Date(Date.UTC(ano, mes, 1));
      const existentes = await prisma.registroPonto.findMany({
        where: { funcionarioId, data: { gte: inicio, lt: fim } },
      });

      const porData = new Map<string, RegistroImportado>();
      for (const e of existentes) {
        const chaveData = e.data.toISOString().slice(0, 10);
        porData.set(chaveData, {
          data: chaveData,
          entrada1: e.entrada1 != null ? minParaHHMM(e.entrada1) : "",
          saida1: e.saida1 != null ? minParaHHMM(e.saida1) : "",
          entrada2: e.entrada2 != null ? minParaHHMM(e.entrada2) : "",
          saida2: e.saida2 != null ? minParaHHMM(e.saida2) : "",
          entrada3: e.entrada3 != null ? minParaHHMM(e.entrada3) : "",
          saida3: e.saida3 != null ? minParaHHMM(e.saida3) : "",
        });
      }
      for (const r of registrosDoMes) porData.set(r.data, r);

      await salvarRegistrosDoMes(funcionarioId, mes, ano, [...porData.values()]);
    }

    await prisma.logAtividade.create({
      data: {
        acao: `Importou ${registros.length} dia(s) de ponto por planilha`,
        entidade: "Funcionario",
        entidadeId: funcionarioId,
        usuario: session.user.name ?? "Usuário",
      },
    });

    return NextResponse.json({ ok: true, dias: registros.length });
  } catch (err) {
    return erroApi(err);
  }
}

function minParaHHMM(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
