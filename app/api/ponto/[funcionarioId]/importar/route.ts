import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { validarPlanilhaDataUri } from "@/lib/planilha";
import { parsarPlanilhaPonto, type RegistroImportado } from "@/lib/importarPonto";
import { inicioMes, fimMes } from "@/lib/pontoWrite";

const MESES_LABEL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Pré-visualização da importação de Ponto: lê a planilha de UM funcionário
 * (já escolhido — a tela em que o upload acontece), agrupa por mês e conta
 * quantos dias já estão lançados nesse mês pra avisar que serão substituídos.
 * Não grava nada — a confirmação de verdade é em .../importar/confirmar. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ funcionarioId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { funcionarioId } = await params;
    const funcionario = await prisma.funcionario.findUnique({ where: { id: funcionarioId } });
    if (!funcionario) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });

    const body = await req.json();
    const validacao = validarPlanilhaDataUri(body?.arquivo);
    if (!validacao.ok) return NextResponse.json({ error: validacao.erro }, { status: 400 });

    const resultado = await parsarPlanilhaPonto(validacao.buffer);
    if (resultado.erro) return NextResponse.json({ error: resultado.erro }, { status: 400 });

    const porMes = new Map<string, RegistroImportado[]>();
    for (const r of resultado.registros) {
      const [ano, mes] = r.data.split("-").map(Number);
      const chave = `${ano}-${mes}`;
      const lista = porMes.get(chave) ?? [];
      lista.push(r);
      porMes.set(chave, lista);
    }

    const meses = await Promise.all(
      [...porMes.entries()].map(async ([chave, registros]) => {
        const [ano, mes] = chave.split("-").map(Number);
        const diasJaExistentes = await prisma.registroPonto.count({
          where: { funcionarioId, data: { gte: inicioMes(mes, ano), lt: fimMes(mes, ano) } },
        });
        return { mes, ano, label: `${MESES_LABEL[mes - 1]} de ${ano}`, diasNaPlanilha: registros.length, diasJaExistentes };
      })
    );
    meses.sort((a, b) => a.ano - b.ano || a.mes - b.mes);

    return NextResponse.json({
      nomeDetectado: resultado.nomeDetectado,
      totalDias: resultado.registros.length,
      meses,
      registros: resultado.registros,
    });
  } catch (err) {
    return erroApi(err);
  }
}
