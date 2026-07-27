import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcularMes, type RegistroPontoDia } from "@/lib/ponto";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const funcionarios = await prisma.funcionario.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
  });

  const registros = await prisma.registroPonto.findMany({
    where: { funcionarioId: { in: funcionarios.map((f) => f.id) } },
    orderBy: { data: "asc" },
  });
  const registrosPorFuncionario = new Map<string, typeof registros>();
  for (const r of registros) {
    const lista = registrosPorFuncionario.get(r.funcionarioId) ?? [];
    lista.push(r);
    registrosPorFuncionario.set(r.funcionarioId, lista);
  }

  const lista = funcionarios.map((f) => {
    const registrosFuncionario = registrosPorFuncionario.get(f.id) ?? [];
    const dias = calcularMes(registrosFuncionario as RegistroPontoDia[], f.jornadaPrevistaMinutos ?? 0);
    const saldoAtual = dias.length > 0 ? dias[dias.length - 1].saldoAcumulado : 0;
    return {
      id: f.id,
      nome: f.nome,
      cargo: f.cargo,
      setor: f.setor,
      jornadaPrevistaMinutos: f.jornadaPrevistaMinutos,
      totalRegistros: registrosFuncionario.length,
      saldoAtual,
    };
  });

  return NextResponse.json(lista);
}
