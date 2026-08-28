import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { horaParaMin } from "@/lib/ponto";

export function inicioMes(mes: number, ano: number) {
  return new Date(Date.UTC(ano, mes - 1, 1));
}
export function fimMes(mes: number, ano: number) {
  return new Date(Date.UTC(ano, mes, 1));
}

export type LinhaPonto = {
  data: string;
  entrada1?: string | null;
  saida1?: string | null;
  entrada2?: string | null;
  saida2?: string | null;
  entrada3?: string | null;
  saida3?: string | null;
  ocorrencia?: string;
  observacao?: string | null;
};

/**
 * Grava os lançamentos de UM mês de UM funcionário: substitui o que já
 * existia nesse intervalo (apaga o que não veio na lista, upsert no resto).
 * Extraído de app/api/ponto/[funcionarioId]/route.ts (PUT) pra ser
 * reaproveitado pelo importador de planilha — mesma semântica dos dois.
 */
export async function salvarRegistrosDoMes(funcionarioId: string, mes: number, ano: number, linhas: LinhaPonto[]) {
  const inicio = inicioMes(mes, ano);
  const fim = fimMes(mes, ano);
  const datasEnviadas = linhas.map((l) => new Date(`${l.data}T00:00:00.000Z`).getTime());

  await prisma.$transaction(async (tx) => {
    await tx.registroPonto.deleteMany({
      where: {
        funcionarioId,
        data: { gte: inicio, lt: fim },
        NOT: { data: { in: datasEnviadas.map((t) => new Date(t)) } },
      },
    });

    if (linhas.length > 0) {
      const valores = linhas.map((linha) => {
        const data = new Date(`${linha.data}T00:00:00.000Z`);
        return Prisma.sql`(
          ${randomUUID()},
          ${funcionarioId},
          ${data},
          ${linha.entrada1 ? horaParaMin(linha.entrada1) : null},
          ${linha.saida1 ? horaParaMin(linha.saida1) : null},
          ${linha.entrada2 ? horaParaMin(linha.entrada2) : null},
          ${linha.saida2 ? horaParaMin(linha.saida2) : null},
          ${linha.entrada3 ? horaParaMin(linha.entrada3) : null},
          ${linha.saida3 ? horaParaMin(linha.saida3) : null},
          ${linha.ocorrencia ?? "NORMAL"}::"OcorrenciaPonto",
          ${linha.observacao || null},
          now(),
          now()
        )`;
      });

      await tx.$executeRaw`
        INSERT INTO "RegistroPonto"
          ("id", "funcionarioId", "data", "entrada1", "saida1", "entrada2", "saida2", "entrada3", "saida3", "ocorrencia", "observacao", "createdAt", "updatedAt")
        VALUES ${Prisma.join(valores)}
        ON CONFLICT ("funcionarioId", "data") DO UPDATE SET
          "entrada1" = EXCLUDED."entrada1",
          "saida1" = EXCLUDED."saida1",
          "entrada2" = EXCLUDED."entrada2",
          "saida2" = EXCLUDED."saida2",
          "entrada3" = EXCLUDED."entrada3",
          "saida3" = EXCLUDED."saida3",
          "ocorrencia" = EXCLUDED."ocorrencia",
          "observacao" = EXCLUDED."observacao",
          "updatedAt" = now()
      `;
    }
  });
}
